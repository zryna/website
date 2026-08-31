import { lstat, mkdir, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { captureValidatedDocsBundle, readBoundedRegular } from './check-bundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOCK_PATH = path.join(ROOT, 'src', 'content', 'compiler-data', 'compiler-docs.lock.json');
const GENERATED_ROOT = path.join(ROOT, 'src', 'content', 'docs', 'reference', 'compiler', 'next');
const LOCK_SCHEMA_PATH = path.join(ROOT, 'schemas', 'compiler-docs-lock-v1.schema.json');
const MAX_LOCK_BYTES = 1024 * 1024;

function fail(message) {
	throw new Error(`compiler documentation import failed: ${message}`);
}

async function loadJson(filePath, maxBytes = MAX_LOCK_BYTES) {
	let bytes;
	try {
		bytes = await readBoundedRegular(filePath, maxBytes);
	} catch (error) {
		fail(`${filePath} is not a stable bounded regular file: ${error.message}`);
	}
	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
	} catch (error) {
		fail(`${filePath} is not strict UTF-8 JSON: ${error.message}`);
	}
}

function exactList(actual, expected, label) {
	if (
		actual.length !== expected.length ||
		actual.some((value, index) => value !== expected[index])
	) {
		fail(`${label} does not match the reviewed lock`);
	}
}

function generatedRelative(documentPath) {
	if (!documentPath.startsWith('documents/') || !documentPath.endsWith('.md')) {
		fail(`unsafe manifest document path ${documentPath}`);
	}
	return documentPath.slice('documents/'.length);
}

function routeFor(documentPath) {
	return `/reference/compiler/next/${generatedRelative(documentPath).slice(0, -3)}/`;
}

function splitUrl(url) {
	const index = url.search(/[?#]/);
	return index === -1 ? [url, ''] : [url.slice(0, index), url.slice(index)];
}

function rewriteRelativeUrl(url, sourcePath, lock, sourceRoutes) {
	if (url.startsWith('#')) return url;
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		parsed = null;
	}
	if (parsed) {
		if (
			parsed.protocol !== 'https:' &&
			parsed.protocol !== 'http:' &&
			parsed.protocol !== 'mailto:'
		) {
			fail(`unsafe link protocol in ${sourcePath}`);
		}
		return url;
	}
	const [target, suffix] = splitUrl(url);
	if (target.length === 0) return suffix;
	let decoded;
	try {
		decoded = decodeURIComponent(target);
	} catch {
		fail(`invalid encoded link in ${sourcePath}`);
	}
	if (decoded.includes('\\') || path.posix.isAbsolute(decoded))
		fail(`unsafe relative link in ${sourcePath}`);
	const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), decoded));
	if (resolved === '..' || resolved.startsWith('../'))
		fail(`link escapes the compiler repository in ${sourcePath}`);
	const internalRoute = sourceRoutes.get(resolved);
	if (internalRoute) return `${internalRoute}${suffix}`;
	const encodedPath = resolved.split('/').map(encodeURIComponent).join('/');
	return `${lock.source.repository}/blob/${lock.source.commit}/${encodedPath}${suffix}`;
}

export function renderImportedDocument(markdown, document, sourcePath, lock, sourceRoutes) {
	if (markdown.startsWith('---\n') || markdown.startsWith('---\r\n')) {
		fail(`${sourcePath} contains forbidden source frontmatter`);
	}
	const processor = unified().use(remarkParse).use(remarkGfm).use(remarkStringify, {
		bullet: '-',
		fences: true,
		listItemIndent: 'one',
	});
	const tree = processor.parse(markdown);
	visit(tree, (node) => {
		if (node.type === 'html') fail(`${sourcePath} contains raw HTML`);
		if (node.type === 'image' || node.type === 'imageReference') {
			fail(`${sourcePath} contains an image outside the v1 import profile`);
		}
		if ((node.type === 'link' || node.type === 'definition') && typeof node.url === 'string') {
			node.url = rewriteRelativeUrl(node.url, sourcePath, lock, sourceRoutes);
		}
	});
	const body = processor.stringify(tree);
	const sourceUrl = `${lock.source.repository}/blob/${lock.source.commit}/${sourcePath}`;
	return `---\ntitle: ${JSON.stringify(document.title)}\ndescription: ${JSON.stringify(`Compiler-owned ${lock.channel} documentation imported from ${lock.source.commit.slice(0, 12)}.`)}\n---\n\n> Verified compiler source: [${sourcePath}](${sourceUrl}) at commit \`${lock.source.commit}\`.\n\n${body}`;
}

export async function buildExpectedCompilerDocs() {
	const lock = await loadJson(LOCK_PATH);
	const schema = await loadJson(LOCK_SCHEMA_PATH);
	const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
	if (!validate(lock))
		fail(`lock schema failed: ${validate.errors[0]?.instancePath} ${validate.errors[0]?.message}`);
	const bundleRoot = path.resolve(ROOT, lock.bundlePath);
	const relativeBundle = path.relative(
		path.join(ROOT, 'src', 'content', 'compiler-data'),
		bundleRoot,
	);
	if (relativeBundle !== 'next') fail('bundle path is outside the registered next channel');
	const captured = await captureValidatedDocsBundle(bundleRoot, {
		expectedManifestSha256: lock.manifestSha256,
		expectedChannel: lock.channel,
		expectedSourceCommit: lock.source.commit,
		expectedSourceRef: lock.source.ref,
	});
	if (captured.diagnostics.length > 0) {
		fail(captured.diagnostics.map((item) => `${item.code} ${item.location}`).join(', '));
	}
	const manifest = captured.manifest;
	if (JSON.stringify(manifest.source) !== JSON.stringify(lock.source))
		fail('manifest source differs from lock');
	const lockedIds = lock.documents.map((document) => document.id);
	const manifestIds = manifest.documents.map((document) => document.id);
	exactList(manifestIds, lockedIds, 'manifest document ids');
	const sourcePaths = new Map(lock.documents.map((document) => [document.id, document.sourcePath]));
	const lockedRoutes = new Map(lock.documents.map((document) => [document.id, document.route]));
	if (new Set(sourcePaths.values()).size !== sourcePaths.size)
		fail('lock source paths are not unique');
	if (new Set(lockedRoutes.values()).size !== lockedRoutes.size) fail('lock routes are not unique');
	for (const document of manifest.documents) {
		if (lockedRoutes.get(document.id) !== routeFor(document.path)) {
			fail(`locked route differs from manifest path for ${document.id}`);
		}
	}
	const sourceRoutes = new Map(
		manifest.documents.map((document) => [
			sourcePaths.get(document.id),
			lockedRoutes.get(document.id),
		]),
	);
	const files = new Map();
	for (const document of manifest.documents) {
		const sourcePath = sourcePaths.get(document.id);
		const bytes = captured.documents.get(document.path);
		if (!bytes) fail(`validated document capture is missing ${document.path}`);
		const markdown = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		files.set(
			generatedRelative(document.path),
			Buffer.from(renderImportedDocument(markdown, document, sourcePath, lock, sourceRoutes)),
		);
	}
	const index = [
		'---',
		'title: Compiler reference (next)',
		'description: Authenticated compiler documentation imported from the next channel.',
		'---',
		'',
		`This reference was imported from compiler commit [\`${lock.source.commit}\`](${lock.source.repository}/commit/${lock.source.commit}).`,
		'',
		...manifest.documents.map((document) => `- [${document.title}](${routeFor(document.path)})`),
		'',
	].join('\n');
	files.set('index.md', Buffer.from(index));
	return files;
}

async function listFiles(root, relative = '', files = []) {
	const entries = await readdir(path.join(root, relative), { withFileTypes: true });
	entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
	for (const entry of entries) {
		const child = relative ? path.posix.join(relative, entry.name) : entry.name;
		if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory()))
			fail(`unsafe generated entry ${child}`);
		if (entry.isDirectory()) await listFiles(root, child, files);
		else files.push(child);
	}
	return files;
}

export async function assertSafeGeneratedRoot(repoRoot = ROOT, generatedRoot = GENERATED_ROOT) {
	const resolvedRepo = path.resolve(repoRoot);
	const resolvedGenerated = path.resolve(generatedRoot);
	const relative = path.relative(resolvedRepo, resolvedGenerated);
	if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)) {
		fail('generated output root is outside the repository');
	}
	const canonicalRepo = await realpath(resolvedRepo);
	let current = resolvedRepo;
	for (const component of relative.split(path.sep)) {
		current = path.join(current, component);
		let metadata;
		try {
			metadata = await lstat(current);
		} catch (error) {
			if (error.code === 'ENOENT') break;
			throw error;
		}
		if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
			fail(`unsafe generated output ancestor ${current}`);
		}
		const canonicalCurrent = await realpath(current);
		const canonicalRelative = path.relative(canonicalRepo, canonicalCurrent);
		if (
			canonicalRelative === '..' ||
			canonicalRelative.startsWith(`..${path.sep}`) ||
			path.resolve(resolvedRepo, canonicalRelative) !== current
		) {
			fail(`generated output ancestor resolves outside its reviewed path: ${current}`);
		}
	}
}

async function writeGenerated(files) {
	const relative = path.relative(path.join(ROOT, 'src', 'content', 'docs'), GENERATED_ROOT);
	if (relative !== path.join('reference', 'compiler', 'next')) fail('unsafe generated output root');
	// The repository is assumed not to be mutated concurrently by a hostile local process.
	// Recheck every existing ancestor immediately before the destructive replacement.
	await assertSafeGeneratedRoot();
	await rm(GENERATED_ROOT, { recursive: true, force: true });
	for (const [relativePath, bytes] of files) {
		const destination = path.join(GENERATED_ROOT, ...relativePath.split('/'));
		await mkdir(path.dirname(destination), { recursive: true });
		await assertSafeGeneratedRoot();
		await writeFile(destination, bytes, { flag: 'wx' });
	}
}

async function checkGenerated(files) {
	const actual = await listFiles(GENERATED_ROOT);
	exactList(
		actual,
		[...files.keys()].sort((left, right) => left.localeCompare(right, 'en')),
		'generated file inventory',
	);
	for (const [relativePath, expected] of files) {
		const actualBytes = await readBoundedRegular(
			path.join(GENERATED_ROOT, ...relativePath.split('/')),
			2 * 1024 * 1024,
		);
		if (!actualBytes.equals(expected)) fail(`generated file is stale: ${relativePath}`);
	}
}

async function main() {
	const mode = process.argv[2];
	if (mode !== '--write' && mode !== '--check') {
		console.error('Usage: node tools/docs/import-bundle.mjs <--write|--check>');
		process.exitCode = 2;
		return;
	}
	try {
		const files = await buildExpectedCompilerDocs();
		if (mode === '--write') await writeGenerated(files);
		else await checkGenerated(files);
		console.log(
			`Compiler documentation import ${mode === '--write' ? 'updated' : 'verified'} (${files.size} files).`,
		);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
	await main();
