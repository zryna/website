import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, opendir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const SEMVER =
	'(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)(?:-(?:(?:0|[1-9][0-9]*)|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\\.(?:(?:0|[1-9][0-9]*)|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?';
const CHANNEL = new RegExp(`^(?:next|${SEMVER})$`);
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_CHECKSUM_BYTES = 128;
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_DOCUMENT_BYTES = 32 * 1024 * 1024;
const MAX_BUNDLE_BYTES = MAX_TOTAL_DOCUMENT_BYTES + 2 * 1024 * 1024;
const MAX_ENTRIES = 2048;
const MAX_DIRECTORIES = 256;
const MAX_DEPTH = 16;
const NO_FOLLOW = constants.O_NOFOLLOW ?? 0;
const schemaPath = fileURLToPath(
	new URL('../../schemas/zryna-docs-bundle-v1.schema.json', import.meta.url),
);
const schema = JSON.parse(
	new TextDecoder('utf-8', { fatal: true }).decode(
		await readBoundedRegular(schemaPath, MAX_MANIFEST_BYTES),
	),
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateSchema = ajv.compile(schema);

function hash(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

function diagnostic(code, location, message) {
	return { code, location, message };
}

function canonicalManifest(manifest) {
	const canonical = {
		schema: manifest.schema,
		version: manifest.version,
		channel: manifest.channel,
		source: {
			repository: manifest.source.repository,
			commit: manifest.source.commit,
			ref: manifest.source.ref,
			version: manifest.source.version,
		},
		documents: manifest.documents.map((document) => ({
			id: document.id,
			path: document.path,
			title: document.title,
			bytes: document.bytes,
			sha256: document.sha256,
		})),
	};
	return Buffer.from(`${JSON.stringify(canonical, null, 2)}\n`);
}

export async function readBoundedRegular(filePath, maxBytes) {
	const metadata = await lstat(filePath);
	if (metadata.isSymbolicLink() || !metadata.isFile())
		throw new Error('not a regular non-symlink file');
	if (metadata.size > maxBytes) throw new Error(`exceeds ${maxBytes} bytes`);

	let handle;
	try {
		handle = await open(filePath, constants.O_RDONLY | NO_FOLLOW);
		const before = await handle.stat();
		if (
			!before.isFile() ||
			before.dev !== metadata.dev ||
			before.ino !== metadata.ino ||
			before.size !== metadata.size
		) {
			throw new Error('file identity changed before read');
		}
		const bytes = await handle.readFile();
		const after = await handle.stat();
		if (
			before.dev !== after.dev ||
			before.ino !== after.ino ||
			before.size !== after.size ||
			before.mtimeMs !== after.mtimeMs ||
			before.ctimeMs !== after.ctimeMs
		) {
			throw new Error('file changed while it was read');
		}
		return bytes;
	} finally {
		await handle?.close();
	}
}

async function scanBundle(root, diagnostics) {
	const files = new Set();
	let entriesSeen = 0;
	let directoriesSeen = 1;
	let bytesSeen = 0;
	let stopped = false;

	function stop(location, message) {
		if (stopped) return;
		stopped = true;
		diagnostics.push(diagnostic('ZWEB-D2010', location, message));
	}

	async function visit(relative, depth) {
		if (stopped) return;
		if (depth > MAX_DEPTH) {
			stop(relative || '.', `bundle exceeds the ${MAX_DEPTH}-level depth budget`);
			return;
		}
		let directory;
		try {
			directory = await opendir(path.join(root, relative));
		} catch (error) {
			diagnostics.push(
				diagnostic('ZWEB-D2008', relative || '.', `cannot scan bundle directory: ${error.message}`),
			);
			return;
		}
		for await (const entry of directory) {
			if (stopped) break;
			entriesSeen += 1;
			const child = relative ? path.posix.join(relative, entry.name) : entry.name;
			if (entriesSeen > MAX_ENTRIES) {
				stop(child, `bundle exceeds the ${MAX_ENTRIES}-entry budget`);
				break;
			}
			let metadata;
			try {
				metadata = await lstat(path.join(root, ...child.split('/')));
			} catch (error) {
				diagnostics.push(
					diagnostic('ZWEB-D2008', child, `bundle entry became unreadable: ${error.message}`),
				);
				continue;
			}
			if (metadata.isSymbolicLink() || (!metadata.isFile() && !metadata.isDirectory())) {
				diagnostics.push(
					diagnostic('ZWEB-D2008', child, 'symlinks and special files are forbidden in bundles'),
				);
				continue;
			}
			if (metadata.isDirectory()) {
				directoriesSeen += 1;
				if (directoriesSeen > MAX_DIRECTORIES) {
					stop(child, `bundle exceeds the ${MAX_DIRECTORIES}-directory budget`);
					break;
				}
				await visit(child, depth + 1);
				continue;
			}
			bytesSeen += metadata.size;
			if (bytesSeen > MAX_BUNDLE_BYTES) {
				stop(child, `bundle exceeds the ${MAX_BUNDLE_BYTES}-byte aggregate budget`);
				break;
			}
			files.add(child);
		}
	}

	await visit('', 0);
	return stopped ? null : files;
}

export async function validateDocsBundle(bundleRoot, expectations = {}) {
	const diagnostics = [];
	if (
		typeof expectations.expectedManifestSha256 !== 'string' ||
		!SHA256.test(expectations.expectedManifestSha256) ||
		typeof expectations.expectedChannel !== 'string' ||
		!CHANNEL.test(expectations.expectedChannel) ||
		typeof expectations.expectedSourceCommit !== 'string' ||
		!COMMIT.test(expectations.expectedSourceCommit) ||
		typeof expectations.expectedSourceRef !== 'string' ||
		expectations.expectedSourceRef.length === 0
	) {
		return [
			diagnostic(
				'ZWEB-D2000',
				'.',
				'an authenticated manifest SHA-256, channel, source commit, and source ref are required',
			),
		];
	}

	const manifestPath = path.join(bundleRoot, 'manifest.json');
	const checksumPath = path.join(bundleRoot, 'manifest.sha256');
	let manifestBytes;
	try {
		manifestBytes = await readBoundedRegular(manifestPath, MAX_MANIFEST_BYTES);
	} catch (error) {
		return [
			diagnostic(
				'ZWEB-D2001',
				'manifest.json',
				`cannot read a bounded regular manifest: ${error.message}`,
			),
		];
	}

	const actualManifestHash = hash(manifestBytes);
	if (actualManifestHash !== expectations.expectedManifestSha256) {
		return [
			diagnostic(
				'ZWEB-D2005',
				'manifest.json',
				'manifest does not match the out-of-band authenticated SHA-256',
			),
		];
	}

	let checksumBytes;
	try {
		checksumBytes = await readBoundedRegular(checksumPath, MAX_CHECKSUM_BYTES);
		new TextDecoder('utf-8', { fatal: true }).decode(checksumBytes);
	} catch (error) {
		return [
			diagnostic(
				'ZWEB-D2004',
				'manifest.sha256',
				`invalid bounded checksum file: ${error.message}`,
			),
		];
	}
	if (checksumBytes.toString('utf8') !== `${actualManifestHash}  manifest.json\n`) {
		diagnostics.push(
			diagnostic(
				'ZWEB-D2004',
				'manifest.sha256',
				'checksum file is not canonical or does not match',
			),
		);
	}

	let manifest;
	try {
		manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
	} catch (error) {
		return [
			diagnostic(
				'ZWEB-D2001',
				'manifest.json',
				`manifest is not valid UTF-8 JSON: ${error.message}`,
			),
		];
	}

	if (!validateSchema(manifest)) {
		for (const error of validateSchema.errors ?? []) {
			diagnostics.push(
				diagnostic(
					'ZWEB-D2002',
					error.instancePath || 'manifest.json',
					`${error.keyword}: ${error.message}`,
				),
			);
		}
		return diagnostics;
	}

	if (!manifestBytes.equals(canonicalManifest(manifest))) {
		diagnostics.push(
			diagnostic(
				'ZWEB-D2003',
				'manifest.json',
				'manifest must use canonical field order, two-space JSON indentation, UTF-8, and one LF',
			),
		);
	}

	if (manifest.channel !== expectations.expectedChannel) {
		diagnostics.push(
			diagnostic(
				'ZWEB-D2009',
				'channel',
				'bundle channel does not match the authenticated expected channel',
			),
		);
	}
	if (
		manifest.source.commit !== expectations.expectedSourceCommit ||
		manifest.source.ref !== expectations.expectedSourceRef
	) {
		diagnostics.push(
			diagnostic(
				'ZWEB-D2009',
				'source',
				'bundle source commit or ref does not match the authenticated expectations',
			),
		);
	}
	if (manifest.channel === 'next') {
		if (manifest.source.ref !== 'refs/heads/main') {
			diagnostics.push(
				diagnostic(
					'ZWEB-D2009',
					'source.ref',
					'the next channel must be exported from refs/heads/main',
				),
			);
		}
	} else if (
		manifest.source.version !== manifest.channel ||
		manifest.source.ref !== `refs/tags/v${manifest.channel}`
	) {
		diagnostics.push(
			diagnostic(
				'ZWEB-D2009',
				'source',
				'a version channel must equal source.version and use the matching immutable v-prefixed tag',
			),
		);
	}

	const ids = new Set();
	const paths = new Set();
	let previousPath = '';
	let declaredBytes = 0;
	for (const [index, document] of manifest.documents.entries()) {
		const location = `documents[${index}]`;
		if (previousPath && previousPath >= document.path) {
			diagnostics.push(
				diagnostic(
					'ZWEB-D2003',
					`${location}.path`,
					'documents must be unique and ASCII-sorted by path',
				),
			);
		}
		previousPath = document.path;
		if (ids.has(document.id) || paths.has(document.path)) {
			diagnostics.push(diagnostic('ZWEB-D2003', location, 'document ids and paths must be unique'));
		}
		ids.add(document.id);
		paths.add(document.path);
		declaredBytes += document.bytes;
	}
	if (declaredBytes > MAX_TOTAL_DOCUMENT_BYTES) {
		diagnostics.push(
			diagnostic(
				'ZWEB-D2010',
				'documents',
				`declared document bytes exceed the ${MAX_TOTAL_DOCUMENT_BYTES}-byte budget`,
			),
		);
	}

	if (diagnostics.length > 0) return diagnostics;

	const actualFiles = await scanBundle(bundleRoot, diagnostics);
	if (!actualFiles) return diagnostics;
	const allowedFiles = new Set([
		'manifest.json',
		'manifest.sha256',
		...manifest.documents.map((document) => document.path),
	]);
	for (const file of actualFiles) {
		if (!allowedFiles.has(file))
			diagnostics.push(diagnostic('ZWEB-D2008', file, 'unlisted bundle file'));
	}
	for (const file of allowedFiles) {
		if (!actualFiles.has(file))
			diagnostics.push(diagnostic('ZWEB-D2006', file, 'listed bundle file is missing'));
	}
	if (diagnostics.length > 0) return diagnostics;

	let actualDocumentBytes = 0;
	for (const document of manifest.documents) {
		const absolute = path.join(bundleRoot, ...document.path.split('/'));
		try {
			const bytes = await readBoundedRegular(absolute, MAX_DOCUMENT_BYTES);
			actualDocumentBytes += bytes.byteLength;
			if (actualDocumentBytes > MAX_TOTAL_DOCUMENT_BYTES)
				throw new Error('aggregate document budget exceeded');
			new TextDecoder('utf-8', { fatal: true }).decode(bytes);
			if (bytes.byteLength !== document.bytes || hash(bytes) !== document.sha256) {
				diagnostics.push(
					diagnostic('ZWEB-D2007', document.path, 'document size or checksum does not match'),
				);
			}
		} catch (error) {
			diagnostics.push(
				diagnostic(
					'ZWEB-D2006',
					document.path,
					`cannot read bounded UTF-8 document: ${error.message}`,
				),
			);
		}
	}

	return diagnostics;
}

export async function captureValidatedDocsBundle(bundleRoot, expectations = {}) {
	const diagnostics = await validateDocsBundle(bundleRoot, expectations);
	if (diagnostics.length > 0) return { diagnostics, manifest: null, documents: null };
	const manifestBytes = await readBoundedRegular(
		path.join(bundleRoot, 'manifest.json'),
		MAX_MANIFEST_BYTES,
	);
	if (hash(manifestBytes) !== expectations.expectedManifestSha256) {
		return {
			diagnostics: [diagnostic('ZWEB-D2005', 'manifest.json', 'manifest changed before capture')],
			manifest: null,
			documents: null,
		};
	}
	const manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
	const documents = new Map();
	let totalBytes = 0;
	for (const document of manifest.documents) {
		const bytes = await readBoundedRegular(
			path.join(bundleRoot, ...document.path.split('/')),
			MAX_DOCUMENT_BYTES,
		);
		totalBytes += bytes.byteLength;
		if (
			totalBytes > MAX_TOTAL_DOCUMENT_BYTES ||
			bytes.byteLength !== document.bytes ||
			hash(bytes) !== document.sha256
		) {
			return {
				diagnostics: [diagnostic('ZWEB-D2007', document.path, 'document changed before capture')],
				manifest: null,
				documents: null,
			};
		}
		new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		documents.set(document.path, bytes);
	}
	return { diagnostics: [], manifest, documents };
}

function parseCliArguments(arguments_) {
	const bundleRoot = arguments_[0];
	const digestIndex = arguments_.indexOf('--expected-manifest-sha256');
	const channelIndex = arguments_.indexOf('--expected-channel');
	const commitIndex = arguments_.indexOf('--expected-source-commit');
	const refIndex = arguments_.indexOf('--expected-source-ref');
	return {
		bundleRoot,
		expectedManifestSha256: digestIndex >= 0 ? arguments_[digestIndex + 1] : undefined,
		expectedChannel: channelIndex >= 0 ? arguments_[channelIndex + 1] : undefined,
		expectedSourceCommit: commitIndex >= 0 ? arguments_[commitIndex + 1] : undefined,
		expectedSourceRef: refIndex >= 0 ? arguments_[refIndex + 1] : undefined,
	};
}

async function main() {
	const arguments_ = parseCliArguments(process.argv.slice(2));
	if (!arguments_.bundleRoot) {
		console.error(
			'Usage: node tools/docs/check-bundle.mjs <bundle-directory> --expected-manifest-sha256 <sha256> --expected-channel <channel> --expected-source-commit <commit> --expected-source-ref <ref>',
		);
		process.exitCode = 2;
		return;
	}
	const diagnostics = await validateDocsBundle(path.resolve(arguments_.bundleRoot), arguments_);
	for (const item of diagnostics) console.error(`${item.code} ${item.location}: ${item.message}`);
	if (diagnostics.length > 0) process.exitCode = 1;
	else console.log('Zryna documentation bundle is authentic, bounded, canonical, and valid.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
	await main();
