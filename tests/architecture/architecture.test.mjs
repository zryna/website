import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateWebsite } from '../../tools/architecture/check.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const required = [
	'.dockerignore',
	'.gitattributes',
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
const allowed = [
	'.dockerignore',
	'.gitattributes',
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
const rootDirectories = new Set([
	'.github',
	'architecture',
	'public',
	'schemas',
	'src',
	'tests',
	'tools',
]);

function contract() {
	return {
		$schema: './schemas/zryna-website-v1.schema.json',
		version: 1,
		profile: 'zryna-website-v1',
		root: {
			required: [...required],
			allowed: [...allowed],
			ignoredGenerated: ['.astro', '.git', '.zryna', 'dist', 'node_modules'],
		},
		source: {
			root: 'src',
			allowedEntries: ['assets', 'content', 'content.config.ts', 'styles'],
		},
		limits: {
			maxEntries: 4096,
			maxDirectories: 512,
			maxDepth: 24,
			maxFileBytes: 2097152,
			maxTotalBytes: 16777216,
		},
	};
}

async function fixture(mutator) {
	const root = await mkdtemp(path.join(os.tmpdir(), 'zryna-website-'));
	for (const entry of required) {
		if (entry === 'zryna.website.json') continue;
		const target = path.join(root, entry);
		if (rootDirectories.has(entry)) await mkdir(target, { recursive: true });
		else await writeFile(target, `${entry}\n`);
	}
	await mkdir(path.join(root, 'src/content'));
	await mkdir(path.join(root, 'src/styles'));
	await writeFile(path.join(root, 'src/content.config.ts'), 'export const collections = {};\n');
	const value = contract();
	if (mutator) await mutator(root, value);
	await writeFile(path.join(root, 'zryna.website.json'), `${JSON.stringify(value, null, 2)}\n`);
	return root;
}

function codes(diagnostics) {
	return diagnostics.map((item) => item.code);
}

test('the real website repository satisfies its contract', async () => {
	assert.deepEqual(await validateWebsite(repositoryRoot), []);
});

test('an unexpected root entry fails closed', async (context) => {
	const root = await fixture(async (candidate) =>
		writeFile(path.join(candidate, 'surprise.txt'), 'no\n'),
	);
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1004'));
});

test('an unknown contract field is rejected', async (context) => {
	const root = await fixture(async (_candidate, value) => {
		value.extra = true;
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1002'));
});

test('a wrong schema identity is rejected', async (context) => {
	const root = await fixture(async (_candidate, value) => {
		value.$schema = './schemas/other.json';
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1001'));
});

test('the generated ignore list cannot hide authored source', async (context) => {
	const root = await fixture(async (_candidate, value) => {
		value.root.ignoredGenerated = ['.astro', '.git', '.zryna', 'dist', 'node_modules', 'src'];
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1001'));
});

test('feature roots stay forbidden until the complete owner engine exists', async (context) => {
	const root = await fixture(async (candidate) => mkdir(path.join(candidate, 'src/features')));
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1004'));
});

test('shared roots stay forbidden until the complete owner engine exists', async (context) => {
	const root = await fixture(async (candidate) => mkdir(path.join(candidate, 'src/shared')));
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1004'));
});

test('a required directory cannot be replaced by a file', async (context) => {
	const root = await fixture(async (candidate) => {
		await rm(path.join(candidate, '.github'), { recursive: true });
		await writeFile(path.join(candidate, '.github'), 'not a directory\n');
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1005'));
});

test('a required source file cannot be replaced by a directory', async (context) => {
	const root = await fixture(async (candidate) => {
		await rm(path.join(candidate, 'src/content.config.ts'));
		await mkdir(path.join(candidate, 'src/content.config.ts'));
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1005'));
});

test('a required root file cannot be replaced by a directory', async (context) => {
	const root = await fixture(async (candidate) => {
		await rm(path.join(candidate, 'README.md'));
		await mkdir(path.join(candidate, 'README.md'));
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1005'));
});

test('a required source directory cannot be replaced by a file', async (context) => {
	const root = await fixture(async (candidate) => {
		await rm(path.join(candidate, 'src/styles'), { recursive: true });
		await writeFile(path.join(candidate, 'src/styles'), 'not a directory\n');
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1005'));
});

test('canonical contract arrays cannot be reordered', async (context) => {
	const root = await fixture(async (_candidate, value) => {
		value.root.allowed = [...value.root.allowed].reverse();
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1001'));
});

test('canonical safety budgets cannot be changed in place', async (context) => {
	const root = await fixture(async (_candidate, value) => {
		value.limits.maxEntries += 1;
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1001'));
});

test('case-colliding root entries are rejected', async (context) => {
	const root = await fixture(async (candidate) =>
		writeFile(path.join(candidate, 'readme.md'), 'x\n'),
	);
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1003'));
});

test('symlinks inside controlled source are rejected', async (context) => {
	const root = await fixture(async (candidate) => {
		await symlink(path.join(candidate, 'src/content'), path.join(candidate, 'src/assets'));
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1201'));
});

test('invalid UTF-8 is rejected', async (context) => {
	const root = await fixture(async (candidate) =>
		writeFile(path.join(candidate, 'README.md'), Buffer.from([0xff])),
	);
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1203'));
});

test('scan depth is globally bounded', async (context) => {
	const root = await fixture(async (candidate) => {
		let directory = path.join(candidate, 'src/content');
		for (let depth = 0; depth < 25; depth += 1) directory = path.join(directory, `d${depth}`);
		await mkdir(directory, { recursive: true });
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1204'));
});

test('scan entry count is globally bounded', async (context) => {
	const root = await fixture(async (candidate) => {
		await Promise.all(
			Array.from({ length: 4096 }, (_value, index) =>
				writeFile(path.join(candidate, 'public', `entry-${String(index).padStart(4, '0')}`), ''),
			),
		);
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1204'));
});

test('scan directory count is globally bounded', async (context) => {
	const root = await fixture(async (candidate) => {
		await Promise.all(
			Array.from({ length: 512 }, (_value, index) =>
				mkdir(path.join(candidate, 'public', `directory-${String(index).padStart(3, '0')}`)),
			),
		);
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1204'));
});

test('individual repository files are globally bounded', async (context) => {
	const root = await fixture(async (candidate) => {
		await writeFile(
			path.join(candidate, 'public', 'oversized.bin'),
			Buffer.alloc(2 * 1024 * 1024 + 1),
		);
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1204'));
});

test('aggregate repository bytes are globally bounded', async (context) => {
	const root = await fixture(async (candidate) => {
		const chunk = Buffer.alloc(2 * 1024 * 1024, 0x61);
		for (let index = 0; index < 9; index += 1) {
			await writeFile(path.join(candidate, 'public', `asset-${index}.bin`), chunk);
		}
	});
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.ok(codes(await validateWebsite(root)).includes('ZWEB-A1204'));
});
