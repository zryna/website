import { TextDecoder } from 'node:util';
import { constants } from 'node:fs';
import { lstat, open, opendir, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

const CONTRACT_FILE = 'zryna.website.json';
const CONTRACT_VERSION = 1;
const CONTRACT_PROFILE = 'zryna-website-v1';
const CONTRACT_KEYS = ['$schema', 'version', 'profile', 'root', 'source', 'limits'];
const ROOT_KEYS = ['required', 'allowed', 'ignoredGenerated'];
const SOURCE_KEYS = ['root', 'allowedEntries'];
const LIMIT_KEYS = ['maxEntries', 'maxDirectories', 'maxDepth', 'maxFileBytes', 'maxTotalBytes'];
const CONTRACT_SCHEMA = './schemas/zryna-website-v1.schema.json';
const CANONICAL_REQUIRED = [
	'.dockerignore',
	'.github',
	'.gitignore',
	'CODE_OF_CONDUCT.md',
	'CONTRIBUTING.md',
	'Dockerfile',
	'LICENSE',
	'NOTICE',
	'README.md',
	'SECURITY.md',
	'architecture',
	'astro.config.mjs',
	'nginx.conf',
	'package.json',
	'pnpm-lock.yaml',
	'pnpm-workspace.yaml',
	'public',
	'schemas',
	'src',
	'tests',
	'tools',
	'tsconfig.json',
	'zryna.website.json',
];
const CANONICAL_ALLOWED = [
	'.dockerignore',
	'.github',
	'.gitignore',
	'.prettierignore',
	'.prettierrc.json',
	'.vscode',
	'CODE_OF_CONDUCT.md',
	'CONTRIBUTING.md',
	'Dockerfile',
	'LICENSE',
	'NOTICE',
	'README.md',
	'SECURITY.md',
	'architecture',
	'astro.config.mjs',
	'nginx.conf',
	'package.json',
	'pnpm-lock.yaml',
	'pnpm-workspace.yaml',
	'public',
	'schemas',
	'src',
	'tests',
	'tools',
	'tsconfig.json',
	'zryna.website.json',
];
const CANONICAL_IGNORED = ['.astro', '.git', '.zryna', 'dist', 'node_modules'];
const CANONICAL_SOURCE_ALLOWED = ['assets', 'content', 'content.config.ts', 'styles'];
const REQUIRED_SOURCE_ENTRIES = ['content', 'content.config.ts', 'styles'];
const CANONICAL_LIMITS = {
	maxEntries: 4096,
	maxDirectories: 512,
	maxDepth: 24,
	maxFileBytes: 2 * 1024 * 1024,
	maxTotalBytes: 16 * 1024 * 1024,
};
const ROOT_DIRECTORIES = new Set([
	'.github',
	'.vscode',
	'architecture',
	'public',
	'schemas',
	'src',
	'tests',
	'tools',
]);
const SOURCE_DIRECTORIES = new Set(['assets', 'content', 'styles']);
const NO_FOLLOW = constants.O_NOFOLLOW ?? 0;

async function readBoundedRegular(filePath, maxBytes) {
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

const contractSchemaPath = fileURLToPath(
	new URL('../../schemas/zryna-website-v1.schema.json', import.meta.url),
);
const contractSchema = JSON.parse(
	new TextDecoder('utf-8', { fatal: true }).decode(
		await readBoundedRegular(contractSchemaPath, 1024 * 1024),
	),
);
const contractAjv = new Ajv2020({ allErrors: true, strict: true });
const validateContractSchema = contractAjv.compile(contractSchema);
const TEXT_EXTENSIONS = new Set([
	'.astro',
	'.css',
	'.html',
	'.js',
	'.json',
	'.jsx',
	'.md',
	'.mdx',
	'.mjs',
	'.svg',
	'.toml',
	'.ts',
	'.tsx',
	'.yaml',
	'.yml',
]);

function diagnostic(code, filePath, message, guidance) {
	return { code, path: filePath, message, guidance };
}

function normalizedRelative(root, target) {
	return path.relative(root, target).replaceAll('\\', '/');
}

function unknownKeys(value, allowed) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return ['<not-an-object>'];
	const known = new Set(allowed);
	return Object.keys(value).filter((key) => !known.has(key));
}

function arraysEqual(actual, expected) {
	return (
		Array.isArray(actual) &&
		actual.length === expected.length &&
		actual.every((entry, index) => entry === expected[index])
	);
}

function limitsEqual(actual) {
	return (
		actual &&
		typeof actual === 'object' &&
		!Array.isArray(actual) &&
		Object.entries(CANONICAL_LIMITS).every(([key, value]) => actual[key] === value)
	);
}

function validEntryName(value) {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.length <= 128 &&
		!value.includes('/') &&
		!value.includes('\\') &&
		value !== '.' &&
		value !== '..' &&
		!/^[A-Za-z]:/.test(value)
	);
}

function validateEntryArray(value, field, diagnostics) {
	if (!Array.isArray(value) || value.length === 0 || value.length > 128) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1001',
				CONTRACT_FILE,
				`${field} must be a non-empty bounded array.`,
				'Restore the canonical website contract.',
			),
		);
		return [];
	}
	const entries = [];
	const exact = new Set();
	const folded = new Set();
	for (const entry of value) {
		if (!validEntryName(entry)) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1003',
					CONTRACT_FILE,
					`${field} contains an unsafe entry.`,
					'Use one normalized immediate entry name without traversal, separators, or drive prefixes.',
				),
			);
			continue;
		}
		const lower = entry.toLowerCase();
		if (exact.has(entry) || folded.has(lower)) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1003',
					CONTRACT_FILE,
					`${field} contains a duplicate or case-colliding entry: ${entry}.`,
					'Keep every registered entry unique on case-sensitive and case-insensitive filesystems.',
				),
			);
			continue;
		}
		exact.add(entry);
		folded.add(lower);
		entries.push(entry);
	}
	return entries;
}

async function loadContract(root, diagnostics) {
	const contractPath = path.join(root, CONTRACT_FILE);
	let metadata;
	try {
		metadata = await lstat(contractPath);
	} catch (error) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1001',
				CONTRACT_FILE,
				`Website contract is unavailable: ${error.message}`,
				`Restore ${CONTRACT_FILE}.`,
			),
		);
		return null;
	}
	if (metadata.isSymbolicLink() || !metadata.isFile()) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1201',
				CONTRACT_FILE,
				'Website contract must be a regular, non-symlink file.',
				'Replace it with a regular UTF-8 JSON file.',
			),
		);
		return null;
	}
	if (metadata.size > 1024 * 1024) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1204',
				CONTRACT_FILE,
				'Website contract exceeds the one MiB safety limit.',
				'Remove generated or unrelated data from the contract.',
			),
		);
		return null;
	}
	let contract;
	try {
		const bytes = await readBoundedRegular(contractPath, 1024 * 1024);
		contract = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
	} catch (error) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1001',
				CONTRACT_FILE,
				`Website contract is not valid UTF-8 JSON: ${error.message}`,
				'Restore the canonical JSON contract.',
			),
		);
		return null;
	}
	if (!validateContractSchema(contract)) {
		for (const error of validateContractSchema.errors ?? []) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1001',
					CONTRACT_FILE,
					`Contract schema violation at ${error.instancePath || '/'}: ${error.message}`,
					'Restore the canonical v1 contract and schema.',
				),
			);
		}
	}
	for (const key of unknownKeys(contract, CONTRACT_KEYS)) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1002',
				CONTRACT_FILE,
				`Unknown website contract field: ${key}.`,
				'Remove the field or introduce it through a new versioned contract.',
			),
		);
	}
	if (
		contract.$schema !== CONTRACT_SCHEMA ||
		contract.version !== CONTRACT_VERSION ||
		contract.profile !== CONTRACT_PROFILE
	) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1001',
				CONTRACT_FILE,
				`Expected schema ${CONTRACT_SCHEMA}, version ${CONTRACT_VERSION}, and profile ${CONTRACT_PROFILE}.`,
				'Restore the canonical website contract identity.',
			),
		);
	}
	for (const key of unknownKeys(contract.root, ROOT_KEYS)) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1002',
				CONTRACT_FILE,
				`Unknown root contract field: ${key}.`,
				'Remove the field or version the contract.',
			),
		);
	}
	for (const key of unknownKeys(contract.source, SOURCE_KEYS)) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1002',
				CONTRACT_FILE,
				`Unknown source contract field: ${key}.`,
				'Remove the field or version the contract.',
			),
		);
	}
	for (const key of unknownKeys(contract.limits, LIMIT_KEYS)) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1002',
				CONTRACT_FILE,
				`Unknown limits contract field: ${key}.`,
				'Remove the field or version the contract.',
			),
		);
	}
	validateEntryArray(contract.root?.required, 'root.required', diagnostics);
	validateEntryArray(contract.root?.allowed, 'root.allowed', diagnostics);
	validateEntryArray(contract.root?.ignoredGenerated, 'root.ignoredGenerated', diagnostics);
	validateEntryArray(contract.source?.allowedEntries, 'source.allowedEntries', diagnostics);
	if (
		!arraysEqual(contract.root?.required, CANONICAL_REQUIRED) ||
		!arraysEqual(contract.root?.allowed, CANONICAL_ALLOWED) ||
		!arraysEqual(contract.root?.ignoredGenerated, CANONICAL_IGNORED) ||
		!arraysEqual(contract.source?.allowedEntries, CANONICAL_SOURCE_ALLOWED)
	) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1001',
				CONTRACT_FILE,
				'Website root, generated-ignore, and source arrays must exactly match the v1 profile.',
				'Change the validator and versioned schema before changing a protected v1 boundary.',
			),
		);
	}
	if (contract.source?.root !== 'src') {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1003',
				CONTRACT_FILE,
				'source.root must be exactly src.',
				'Keep authored website source inside src.',
			),
		);
	}
	if (!limitsEqual(contract.limits)) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1001',
				CONTRACT_FILE,
				'Website scan limits must exactly match the bounded v1 safety budget.',
				'Change the validator and versioned schema before changing a protected v1 budget.',
			),
		);
	}
	return {
		required: CANONICAL_REQUIRED,
		allowed: CANONICAL_ALLOWED,
		ignoredGenerated: CANONICAL_IGNORED,
		allowedEntries: CANONICAL_SOURCE_ALLOWED,
		limits: CANONICAL_LIMITS,
	};
}

async function validateRootShape(root, contract, diagnostics) {
	let entries;
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch (error) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1205',
				'.',
				`Cannot completely inspect repository root: ${error.message}`,
				'Restore read access before validating.',
			),
		);
		return;
	}
	const present = new Set(entries.map((entry) => entry.name));
	const allowed = new Set([...contract.allowed, ...contract.ignoredGenerated]);
	const folded = new Map();
	for (const entry of entries) {
		const lower = entry.name.toLowerCase();
		if (folded.has(lower) && folded.get(lower) !== entry.name) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1003',
					entry.name,
					`Root entry collides by case with ${folded.get(lower)}.`,
					'Use one canonical entry name.',
				),
			);
		}
		folded.set(lower, entry.name);
		if (!allowed.has(entry.name)) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1004',
					entry.name,
					'Entry is outside the strict website root contract.',
					`Move it into a registered owner or update ${CONTRACT_FILE} deliberately.`,
				),
			);
		}
		if (!contract.ignoredGenerated.includes(entry.name) && contract.allowed.includes(entry.name)) {
			const expectedDirectory = ROOT_DIRECTORIES.has(entry.name);
			if (
				entry.isSymbolicLink() ||
				(expectedDirectory && !entry.isDirectory()) ||
				(!expectedDirectory && !entry.isFile())
			) {
				diagnostics.push(
					diagnostic(
						'ZWEB-A1005',
						entry.name,
						`Website entry must be a regular ${expectedDirectory ? 'directory' : 'file'}.`,
						'Restore the canonical entry shape and do not use symlinks.',
					),
				);
			}
		}
	}
	for (const entry of contract.required) {
		if (!present.has(entry)) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1005',
					entry,
					'Required website entry is missing.',
					'Restore the canonical file or directory.',
				),
			);
		}
	}
}

async function validateSourceShape(root, contract, diagnostics) {
	const sourceRoot = path.join(root, 'src');
	let entries;
	try {
		entries = await readdir(sourceRoot, { withFileTypes: true });
	} catch (error) {
		diagnostics.push(
			diagnostic(
				'ZWEB-A1205',
				'src',
				`Cannot inspect source root: ${error.message}`,
				'Restore a readable src directory.',
			),
		);
		return;
	}
	const allowed = new Set(contract.allowedEntries);
	const present = new Set(entries.map((entry) => entry.name));
	const folded = new Set();
	for (const entry of entries) {
		const lower = entry.name.toLowerCase();
		if (folded.has(lower)) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1003',
					`src/${entry.name}`,
					'Source root contains case-colliding entries.',
					'Use one canonical source entry name.',
				),
			);
		}
		folded.add(lower);
		if (!allowed.has(entry.name)) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1004',
					`src/${entry.name}`,
					'Entry is outside the strict source ownership contract.',
					'Use only content, styles, assets, or the canonical content config in the v1 profile.',
				),
			);
			continue;
		}
		const expectedDirectory = SOURCE_DIRECTORIES.has(entry.name);
		if (
			entry.isSymbolicLink() ||
			(expectedDirectory && !entry.isDirectory()) ||
			(!expectedDirectory && !entry.isFile())
		) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1005',
					`src/${entry.name}`,
					`Source entry must be a regular ${expectedDirectory ? 'directory' : 'file'}.`,
					'Restore the canonical source entry shape and do not use symlinks.',
				),
			);
		}
	}
	for (const entry of REQUIRED_SOURCE_ENTRIES) {
		if (!present.has(entry)) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1005',
					`src/${entry}`,
					'Required source entry is missing.',
					'Restore the canonical source layout.',
				),
			);
		}
	}
}

async function boundedScan(root, contract, diagnostics) {
	const ignored = new Set(contract.ignoredGenerated);
	let entryCount = 0;
	let directoryCount = 1;
	let totalBytes = 0;
	let stopped = false;

	function stop(code, filePath, message, guidance) {
		if (stopped) return;
		stopped = true;
		diagnostics.push(diagnostic(code, filePath, message, guidance));
	}

	async function readStableText(absolute, relative, metadata) {
		let handle;
		try {
			handle = await open(absolute, constants.O_RDONLY | NO_FOLLOW);
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
			new TextDecoder('utf-8', { fatal: true }).decode(bytes);
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
		} catch (error) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1203',
					relative,
					`Text file is unstable, unreadable, symlinked, or invalid UTF-8: ${error.message}`,
					'Stop concurrent writes and restore a stable regular UTF-8 file.',
				),
			);
		} finally {
			await handle?.close();
		}
	}

	async function visit(directory, depth) {
		if (stopped) return;
		if (depth > contract.limits.maxDepth) {
			stop(
				'ZWEB-A1204',
				normalizedRelative(root, directory),
				'Deterministic scan depth limit exceeded.',
				'Reduce nesting or introduce a new versioned safety budget deliberately.',
			);
			return;
		}
		let entries;
		try {
			entries = await opendir(directory);
		} catch (error) {
			diagnostics.push(
				diagnostic(
					'ZWEB-A1205',
					normalizedRelative(root, directory),
					`Directory could not be fully scanned: ${error.message}`,
					'Restore read access before validation.',
				),
			);
			return;
		}
		const folded = new Set();
		for await (const entry of entries) {
			if (stopped) break;
			if (depth === 0 && ignored.has(entry.name)) continue;
			entryCount += 1;
			if (entryCount > contract.limits.maxEntries) {
				stop(
					'ZWEB-A1204',
					'.',
					'Deterministic scan entry limit exceeded.',
					'Remove generated content or introduce a new versioned safety budget.',
				);
				return;
			}
			const lower = entry.name.toLowerCase();
			if (folded.has(lower)) {
				diagnostics.push(
					diagnostic(
						'ZWEB-A1003',
						normalizedRelative(root, path.join(directory, entry.name)),
						'Directory contains case-colliding entries.',
						'Use one canonical file name.',
					),
				);
			}
			folded.add(lower);
			const absolute = path.join(directory, entry.name);
			const relative = normalizedRelative(root, absolute);
			let metadata;
			try {
				metadata = await lstat(absolute);
			} catch (error) {
				diagnostics.push(
					diagnostic(
						'ZWEB-A1205',
						relative,
						`Entry changed or became unreadable during scan: ${error.message}`,
						'Retry after filesystem activity stops.',
					),
				);
				continue;
			}
			if (metadata.isSymbolicLink() || (!metadata.isDirectory() && !metadata.isFile())) {
				diagnostics.push(
					diagnostic(
						'ZWEB-A1201',
						relative,
						'Controlled website content must be regular and non-symlinked.',
						'Replace it with a regular file or directory inside the repository.',
					),
				);
				continue;
			}
			if (metadata.isDirectory()) {
				directoryCount += 1;
				if (directoryCount > contract.limits.maxDirectories) {
					stop(
						'ZWEB-A1204',
						relative,
						'Deterministic scan directory limit exceeded.',
						'Reduce directory fan-out or introduce a new versioned safety budget.',
					);
					return;
				}
				try {
					const resolved = await realpath(absolute);
					if (resolved !== absolute) throw new Error('directory does not resolve to itself');
				} catch (error) {
					diagnostics.push(
						diagnostic(
							'ZWEB-A1201',
							relative,
							`Controlled directory is unstable or escapes its path: ${error.message}`,
							'Restore a real directory inside the canonical repository.',
						),
					);
					continue;
				}
				await visit(absolute, depth + 1);
				continue;
			}
			if (metadata.size > contract.limits.maxFileBytes) {
				diagnostics.push(
					diagnostic(
						'ZWEB-A1204',
						relative,
						'File exceeds the deterministic per-file size limit.',
						'Move large generated or binary artifacts out of source control.',
					),
				);
				continue;
			}
			totalBytes += metadata.size;
			if (totalBytes > contract.limits.maxTotalBytes) {
				stop(
					'ZWEB-A1204',
					relative,
					'Deterministic aggregate byte limit exceeded.',
					'Move generated or large artifacts out of source control.',
				);
				return;
			}
			if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || entry.name === 'LICENSE') {
				await readStableText(absolute, relative, metadata);
			}
		}
	}
	await visit(root, 0);
}

export async function validateWebsite(candidateRoot) {
	const diagnostics = [];
	let root;
	try {
		const metadata = await lstat(candidateRoot);
		if (metadata.isSymbolicLink() || !metadata.isDirectory())
			throw new Error('root is not a real directory');
		root = await realpath(candidateRoot);
	} catch (error) {
		return [
			diagnostic(
				'ZWEB-A1201',
				String(candidateRoot),
				`Website root is unsafe or unavailable: ${error.message}`,
				'Open the canonical repository directory directly.',
			),
		];
	}
	const contract = await loadContract(root, diagnostics);
	if (!contract) return diagnostics;
	await validateRootShape(root, contract, diagnostics);
	await validateSourceShape(root, contract, diagnostics);
	await boundedScan(root, contract, diagnostics);
	diagnostics.sort((left, right) =>
		`${left.code}\0${left.path}\0${left.message}`.localeCompare(
			`${right.code}\0${right.path}\0${right.message}`,
		),
	);
	return diagnostics;
}

async function main() {
	const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
	const diagnostics = await validateWebsite(root);
	if (diagnostics.length === 0) {
		console.log('Zryna website architecture is valid.');
		return;
	}
	for (const item of diagnostics) {
		console.error(`${item.code} ${item.path}: ${item.message}`);
		console.error(`  ${item.guidance}`);
	}
	process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) await main();
