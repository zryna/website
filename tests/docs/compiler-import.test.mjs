import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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

const COMMIT = '97eb9c8b64f9e534ad76de996c2eece85a25f729';
const MANIFEST_DIGEST = '665498348a30b6fd62cfe17bdd270eadab22b8f982dae302d748d7886dfa19bf';
const LOCK = {
	channel: 'next',
	source: { repository: 'https://github.com/zryna/zryna', commit: COMMIT },
};
const DOCUMENT = { title: 'Example' };

test('builds the exact reviewed compiler import with immutable rewritten links', async () => {
	const files = await buildExpectedCompilerDocs();
	assert.equal(files.size, 31);
	assert.deepEqual(
		[...files.keys()],
		[
			'reference/aggregate-layout-v1.md',
			'reference/architecture.md',
			'reference/cli.md',
			'reference/control-flow-modules-v1.md',
			'reference/data-ownership-v1.md',
			'reference/documentation-bundles.md',
			'reference/frontends.md',
			'reference/language-overview.md',
			'reference/m2-conformance.md',
			'reference/m2-control-flow-semantics.md',
			'reference/m2-javascript-backend.md',
			'reference/m2-manifest-v2.md',
			'reference/m2-module-closure.md',
			'reference/m2-native-backend.md',
			'reference/m2-native-mir.md',
			'reference/m2-straight-line-semantics.md',
			'reference/m2-webassembly-backend.md',
			'reference/m3-borrowing-semantics.md',
			'reference/m3-copy-aggregate-semantics.md',
			'reference/m3-data-ownership-ir.md',
			'reference/m3-owned-data-semantics.md',
			'reference/m3-ownership-runtime-abi.md',
			'reference/memory-model.md',
			'reference/ownership-runtime-v1.md',
			'reference/scalar-abi-v1.md',
			'reference/syntax-protocol-v4.md',
			'status/current.md',
			'status/m0-conformance.md',
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
	const m2Conformance = files.get('reference/m2-conformance.md').toString('utf8');
	assert.match(m2Conformance, new RegExp(`blob/${COMMIT}/docs/M2_CONFORMANCE\\.md`));
	assert.match(m2Conformance, /`tests\/m2-conformance-v1\.json`/);
	const borrowing = files.get('reference/m3-borrowing-semantics.md').toString('utf8');
	assert.match(borrowing, new RegExp(`blob/${COMMIT}/docs/M3_BORROWING_SEMANTICS\\.md`));
	assert.match(
		borrowing,
		/exactly 36 source and\s+protocol-v4 snapshot files, 5 accepted cases, and 13 excluded cases/,
	);
	const index = files.get('index.md').toString('utf8');
	assert.match(index, /\/reference\/compiler\/next\/reference\/m3-borrowing-semantics\//);
});

test('authored status presents bounded internal borrowing evidence without broad runtime claims', async () => {
	const root = new URL('../../src/content/docs/', import.meta.url);
	const status = await readFile(new URL('reference/compiler-status.md', root), 'utf8');
	const home = await readFile(new URL('index.mdx', root), 'utf8');
	const gettingStarted = await readFile(new URL('guides/getting-started.md', root), 'utf8');
	const roadmap = await readFile(new URL('guides/roadmap.md', root), 'utf8');
	for (const content of [status, home, gettingStarted, roadmap]) {
		assert.doesNotMatch(
			content,
			/M2 features remain unsupported|Add control flow and functions through .* M2/,
		);
	}
	assert.match(status, new RegExp(COMMIT));
	assert.match(status, new RegExp(MANIFEST_DIGEST));
	assert.match(status, /\/reference\/compiler\/next\/reference\/m3-borrowing-semantics\//);
	assert.match(
		status,
		/bounded private straight-line, exact-signature, whole-root direct-call boundary/,
	);
	assert.match(status, /M1 default and explicit M2 remain the only public profiles/);
	assert.match(
		status,
		/does\s+not activate general M3 support or add runtime lifetime state, an ABI, a backend path, a driver or\s+CLI route, or a target artifact/,
	);
	assert.doesNotMatch(status, /M3 (?:is )?(?:implemented|supported|publicly available)/i);
	assert.doesNotMatch(
		status,
		/M3 (?:is )?(?:enabled|active|activated|production-ready|a public profile)/i,
	);
	assert.doesNotMatch(
		status,
		/(?:general|public) borrowing (?:is )?(?:supported|enabled|active|available)/i,
	);
	assert.doesNotMatch(
		status,
		/(?:runtime|backend|ABI|driver|CLI|target) (?:is )?(?:enabled|active|activated|supported|available)/i,
	);
	assert.match(home, /explicit M2 `control-flow-v1` profile/);
	assert.match(gettingStarted, /not a general zero-runtime\s+or GC-free guarantee/);
	assert.match(roadmap, /Completed as the explicit M2 `control-flow-v1` profile/);
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
