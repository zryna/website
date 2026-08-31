import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
	assertSafeGeneratedRoot,
	buildExpectedCompilerDocs,
	parseCanonicalJson,
	renderImportedDocument,
	validateLockedSourcePaths,
} from '../../tools/docs/import-bundle.mjs';
import { readBoundedRegular } from '../../tools/docs/check-bundle.mjs';

const COMMIT = '90615aecbbdc27836bbed3992d6736909f82ab58';
const LOCK = {
	channel: 'next',
	source: { repository: 'https://github.com/zryna/zryna', commit: COMMIT },
};
const DOCUMENT = { title: 'Example' };

test('builds the exact reviewed compiler import with immutable rewritten links', async () => {
	const files = await buildExpectedCompilerDocs();
	assert.equal(files.size, 9);
	assert.deepEqual(
		[...files.keys()],
		[
			'reference/architecture.md',
			'reference/cli.md',
			'reference/documentation-bundles.md',
			'reference/language-overview.md',
			'reference/scalar-abi-v1.md',
			'status/current.md',
			'status/m1-conformance.md',
			'status/roadmap.md',
			'index.md',
		],
	);
	const status = files.get('status/current.md').toString('utf8');
	assert.match(status, new RegExp(COMMIT));
	assert.match(status, /\/reference\/compiler\/next\/reference\/cli\//);
	assert.doesNotMatch(status, /\]\(CLI\.md\)/);
	const conformance = files.get('status/m1-conformance.md').toString('utf8');
	assert.match(conformance, new RegExp(`blob/${COMMIT}/tests/m1-conformance-v1\\.json`));
});

test('rejects raw HTML and active URL protocols before generation', () => {
	assert.throws(
		() =>
			renderImportedDocument(
				'<script>alert(1)</script>\n',
				DOCUMENT,
				'docs/EXAMPLE.md',
				LOCK,
				new Map(),
			),
		/raw HTML/,
	);
	assert.throws(
		() =>
			renderImportedDocument(
				'[unsafe](javascript:alert(1))\n',
				DOCUMENT,
				'docs/EXAMPLE.md',
				LOCK,
				new Map(),
			),
		/unsafe link protocol/,
	);
	assert.throws(
		() =>
			renderImportedDocument(
				'[insecure](http://example.com)\n',
				DOCUMENT,
				'docs/EXAMPLE.md',
				LOCK,
				new Map(),
			),
		/unsafe link protocol/,
	);
});

test('rejects compiler frontmatter and repository traversal links', () => {
	assert.throws(
		() =>
			renderImportedDocument(
				'---\ntitle: Replaced\n---\n',
				DOCUMENT,
				'docs/EXAMPLE.md',
				LOCK,
				new Map(),
			),
		/forbidden source frontmatter/,
	);
	assert.throws(
		() =>
			renderImportedDocument(
				'[escape](../../outside.md)\n',
				DOCUMENT,
				'docs/EXAMPLE.md',
				LOCK,
				new Map(),
			),
		/link escapes/,
	);
});

test('reads reviewed trust files through a stable non-symlink handle', async (context) => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'zryna-lock-read-'));
	try {
		const regular = path.join(root, 'lock.json');
		const linked = path.join(root, 'linked-lock.json');
		await writeFile(regular, '{}\n');
		try {
			await symlink(regular, linked, 'file');
		} catch (error) {
			if (error.code === 'EPERM' || error.code === 'EACCES') {
				context.skip('host does not permit test symlinks');
				return;
			}
			throw error;
		}
		assert.equal((await readBoundedRegular(regular, 64)).toString('utf8'), '{}\n');
		await assert.rejects(readBoundedRegular(linked, 64), /regular non-symlink/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test('rejects a symlinked generated-output ancestor', async (context) => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'zryna-generated-root-'));
	try {
		const repo = path.join(root, 'repo');
		const outside = path.join(root, 'outside');
		await mkdir(path.join(repo, 'src', 'content', 'docs'), { recursive: true });
		await mkdir(outside);
		try {
			await symlink(outside, path.join(repo, 'src', 'content', 'docs', 'reference'), 'dir');
		} catch (error) {
			if (error.code === 'EPERM' || error.code === 'EACCES') {
				context.skip('host does not permit test symlinks');
				return;
			}
			throw error;
		}
		await assert.rejects(
			assertSafeGeneratedRoot(
				repo,
				path.join(repo, 'src', 'content', 'docs', 'reference', 'compiler', 'next'),
			),
			/unsafe generated output ancestor/,
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test('rejects non-canonical or duplicate-key trust locks', () => {
	assert.throws(
		() => parseCanonicalJson(Buffer.from('{"schema":1,"schema":2}\n'), 'lock.json'),
		/not canonical JSON or contains duplicate object keys/,
	);
});

test('rejects non-portable and case-colliding locked source paths', () => {
	assert.throws(
		() => validateLockedSourcePaths(['docs/../outside.md']),
		/not portable and repository-relative/,
	);
	assert.throws(
		() => validateLockedSourcePaths(['docs/STATUS.md', 'docs/status.md']),
		/collide case-insensitively/,
	);
});
