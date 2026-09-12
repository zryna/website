import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

import {
	assertSafeGeneratedRoot,
	buildExpectedCompilerDocs,
	parseCanonicalJson,
	renderImportedDocument,
	routeFor,
	validateLockedSourcePaths,
	writeGeneratedCompilerDocs,
} from '../../tools/docs/import-bundle.mjs';
import { readBoundedRegular } from '../../tools/docs/check-bundle.mjs';
import {
	COMPILER_IMPORTS,
	importPaths,
	loadRegisteredCompilerLocks,
	validateCompilerImports,
	validateImportIdentity,
} from '../../tools/docs/compiler-imports.mjs';

const COMMIT = '4c9fbda9ca80decf755fb8313474217e051eb5c8';
const MANIFEST_DIGEST = '7e3b3e597546737a0ebc175e8889cbf80b28d8b727313bf379916a6489a65f03';
const RELEASE_COMMIT = 'f4d28002a014cd2e717eba4e59764bd925bef8c1';
const RELEASE_MANIFEST_DIGEST =
	'838a30b84c68989775ee82bd9d36dcbd53838f29745527efefaac29d3f4d6daa';
const LOCK = {
	channel: 'next',
	source: { repository: 'https://github.com/zryna/zryna', commit: COMMIT },
};
const DOCUMENT = { title: 'Example' };

test('builds the exact reviewed compiler import with immutable rewritten links', async () => {
	const files = await buildExpectedCompilerDocs();
	assert.equal(files.size, 46);
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
			'reference/getting-started.md',
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
			'reference/m3-candidate-driver.md',
			'reference/m3-conformance.md',
			'reference/m3-copy-aggregate-semantics.md',
			'reference/m3-data-ownership-ir.md',
			'reference/m3-generic-clone-core.md',
			'reference/m3-generic-function-operations.md',
			'reference/m3-generic-static-places.md',
			'reference/m3-generic-vec-operations.md',
			'reference/m3-getting-started.md',
			'reference/m3-indexed-borrow-authority.md',
			'reference/m3-opaque-handle-slots.md',
			'reference/m3-owned-data-semantics.md',
			'reference/m3-ownership-composition-evidence.md',
			'reference/m3-ownership-composition.md',
			'reference/m3-ownership-runtime-abi.md',
			'reference/m3-public-profile.md',
			'reference/m3-shared-weak-authority.md',
			'reference/m3-shared-weak-evidence.md',
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
		/Status: bounded compiler-boundary implementation complete for Issue #82/,
	);
	assert.match(
		borrowing,
		/Nested\/repeated control-flow borrowing remains a dependency-ordered later/,
	);
	const guide = files.get('reference/getting-started.md').toString('utf8');
	assert.match(guide, new RegExp(`blob/${COMMIT}/docs/GETTING_STARTED\\.md`));
	assert.match(
		guide,
		/\/reference\/compiler\/next\/reference\/m2-control-flow-semantics\/#accepted-control-flow/,
	);
	assert.match(guide, /ZRYNA-B2102/);
	assert.match(guide, /ZRYNA-C1009/);
	const index = files.get('index.md').toString('utf8');
	assert.match(index, /\/reference\/compiler\/next\/reference\/m3-borrowing-semantics\//);
	assert.match(index, /\/reference\/compiler\/next\/reference\/getting-started\//);
	for (const id of ['m3-ownership-composition', 'm3-ownership-composition-evidence']) {
		assert(index.includes(`/reference/compiler/next/reference/${id}/`));
	}
	const composition = files.get('reference/m3-ownership-composition.md').toString('utf8');
	const evidence = files.get('reference/m3-ownership-composition-evidence.md').toString('utf8');
	assert(composition.includes(`blob/${COMMIT}/docs/M3_OWNERSHIP_COMPOSITION.md`));
	assert(evidence.includes(`blob/${COMMIT}/docs/M3_OWNERSHIP_COMPOSITION_EVIDENCE.md`));
	assert(
		composition.includes('/reference/compiler/next/reference/m3-ownership-composition-evidence/'),
	);
	assert(evidence.includes('/reference/compiler/next/reference/m3-ownership-composition/'));
	assert.match(
		composition,
		/planned implementation contract, not implemented generic source semantics/,
	);
	assert.match(
		evidence,
		/generic evidence and integration matrix with implemented internal ownership/,
	);
	assert.match(
		evidence,
		/composition checkpoints described below\. No public profile or target execution is enabled/,
	);
	assert.match(evidence, /single scratch owner state/);
	assert.match(
		evidence,
		/Preparation rejection preserves the real instruction\/place\/cleanup arenas/,
	);
	assert.match(evidence, /Mandatory independent full IR verification remains separate/);
	assert.match(evidence, /does not complete generic C2, #278, #83 or M3/);
});

test('authored M3 status preserves earlier profiles and explicit exclusions', async () => {
	const root = new URL('../../src/content/docs/', import.meta.url);
	const status = await readFile(new URL('reference/compiler-status.md', root), 'utf8');
	const home = await readFile(new URL('index.mdx', root), 'utf8');
	const gettingStarted = await readFile(new URL('guides/getting-started.md', root), 'utf8');
	const roadmap = await readFile(new URL('guides/roadmap.md', root), 'utf8');
	for (const content of [status, home, gettingStarted, roadmap]) {
		assert(content.includes('data-ownership-v1'));
		assert(content.includes('/reference/compiler/next/reference/m3-getting-started/'));
		assert.doesNotMatch(content, /only public profiles|not runnable public M3/);
	}
	assert(status.includes(COMMIT));
	assert(status.includes(MANIFEST_DIGEST));
	for (const marker of [
		'manifest v3',
		'M1',
		'M2',
		'Windows native execution',
		'public owned/aggregate',
		'tracing GC',
		'WASI',
		'Components',
		'not production-ready',
	])
		assert(status.includes(marker), marker);
	for (const id of ['m3-public-profile', 'm3-conformance', 'm3-candidate-driver'])
		assert(status.includes(`/reference/compiler/next/reference/${id}/`));
	assert(home.includes('explicit M2 `control-flow-v1` profile'));
	assert(roadmap.includes('Completed as the explicit M2 `control-flow-v1` profile'));
	for (const marker of [
		RELEASE_COMMIT,
		RELEASE_MANIFEST_DIGEST,
		'https://github.com/zryna/zryna/releases/tag/v0.1.0',
		'/reference/compiler/0.1.0/',
		'389700329d3a3b78b6c0aa182df747c0fb4f8ce2e01b1733e1be5439d0380a1f',
		'6654afacb1495b35cb36257d8cfe1387f54ae8f3b813b6fe802e4a035d55270f',
	]) {
		assert(status.includes(marker), marker);
	}
	assert(home.includes('https://github.com/zryna/zryna/releases/tag/v0.1.0'));
	assert(home.includes('/reference/compiler/0.1.0/'));
});

test('walkthrough navigation and authored provenance agree with the reviewed import', async () => {
	const root = new URL('../../', import.meta.url);
	const config = await readFile(new URL('astro.config.mjs', root), 'utf8');
	const guide = await readFile(new URL('src/content/docs/guides/getting-started.md', root), 'utf8');
	const provenance = await readFile(
		new URL('src/content/docs/reference/documentation-bundles.md', root),
		'utf8',
	);
	const lock = JSON.parse(
		await readFile(new URL('src/content/compiler-data/compiler-docs.lock.json', root), 'utf8'),
	);
	assert.equal(lock.source.commit, COMMIT);
	assert.equal(lock.manifestSha256, MANIFEST_DIGEST);
	assert.equal(lock.documents.length, 45);
	assert(config.includes("slug: 'reference/compiler/next/reference/getting-started'"));
	assert(config.includes("slug: 'reference/compiler/next/reference/m3-getting-started'"));
	assert(guide.includes('/reference/compiler/next/reference/getting-started/'));
	for (const marker of [
		COMMIT,
		MANIFEST_DIGEST,
		'34091122586',
		'10007513825',
		'79e48bd995bcb89482186a2062212d5c2de5314dbf45ea6b5cbde0efa3f18c7d',
	]) {
		assert(provenance.includes(marker), marker);
	}
	for (const marker of [RELEASE_COMMIT, RELEASE_MANIFEST_DIGEST, '/reference/compiler/0.1.0/']) {
		assert(provenance.includes(marker), marker);
	}
	assert(provenance.includes('pnpm docs:export --channel next'));
	assert(!provenance.includes('pnpm docs:export -- --channel'));
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

test('derives strict semantic-version import paths and rewrites links within that channel', () => {
	const registration = {
		channel: '0.1.0',
		lockPath: 'src/content/compiler-data/compiler-docs-v0.1.0.lock.json',
	};
	const lock = {
		channel: '0.1.0',
		bundlePath: 'src/content/compiler-data/0.1.0',
		source: {
			repository: 'https://github.com/zryna/zryna',
			commit: 'a'.repeat(40),
			ref: 'refs/tags/v0.1.0',
			version: '0.1.0',
		},
		documents: [{ route: '/reference/compiler/0.1.0/reference/example/' }],
	};
	assert.deepEqual(importPaths('0.1.0'), {
		bundlePath: 'src/content/compiler-data/0.1.0',
		generatedPath: 'src/content/docs/reference/compiler/0.1.0',
		rootRoute: '/reference/compiler/0.1.0/',
	});
	validateImportIdentity(registration, lock);
	assert.equal(
		routeFor('documents/reference/example.md', '0.1.0'),
		'/reference/compiler/0.1.0/reference/example/',
	);
	const rendered = renderImportedDocument(
		'[Other](OTHER.md)\n',
		DOCUMENT,
		'docs/EXAMPLE.md',
		lock,
		new Map([['docs/OTHER.md', '/reference/compiler/0.1.0/reference/other/']]),
	);
	assert(rendered.includes('](/reference/compiler/0.1.0/reference/other/)'));
	assert(rendered.includes(`/blob/${'a'.repeat(40)}/docs/EXAMPLE.md`));
});

test('registers the immutable 0.1.0 compiler documentation identity', async () => {
	const release = COMPILER_IMPORTS.find((entry) => entry.channel === '0.1.0');
	assert.deepEqual(release, {
		channel: '0.1.0',
		lockPath: 'src/content/compiler-data/compiler-docs-0.1.0.lock.json',
	});
	const imports = await loadRegisteredCompilerLocks(
		fileURLToPath(new URL('../../', import.meta.url)),
	);
	const locked = imports.find((entry) => entry.registration.channel === '0.1.0');
	assert(locked);
	assert.equal(locked.lock.source.commit, RELEASE_COMMIT);
	assert.equal(locked.lock.source.ref, 'refs/tags/v0.1.0');
	assert.equal(
		locked.lock.manifestSha256,
		RELEASE_MANIFEST_DIGEST,
	);
	assert.equal(locked.lock.documents.length, 47);
});

test('rejects unsafe, duplicate, and mismatched compiler import registrations', () => {
	const next = {
		channel: 'next',
		lockPath: 'src/content/compiler-data/compiler-docs.lock.json',
	};
	assert.throws(() => validateCompilerImports([next, { ...next }]), /duplicate channel/);
	assert.throws(
		() => validateCompilerImports([{ channel: '1.2', lockPath: next.lockPath }]),
		/unsafe channel/,
	);
	assert.throws(
		() =>
			validateImportIdentity(
				{ channel: '0.1.0', lockPath: 'src/content/compiler-data/release.lock.json' },
				{
					channel: '0.1.0',
					bundlePath: 'src/content/compiler-data/next',
					source: { version: '0.1.0', ref: 'refs/tags/v0.1.0' },
					documents: [],
				},
			),
		/bundle path differs/,
	);
	assert.throws(
		() =>
			validateImportIdentity(
				{ channel: '0.1.0', lockPath: 'src/content/compiler-data/release.lock.json' },
				{
					channel: '0.1.0',
					bundlePath: 'src/content/compiler-data/0.1.0',
					source: { version: '0.1.0', ref: 'refs/tags/v0.1.1' },
					documents: [],
				},
			),
		/release lock ref differs/,
	);
});

test('lock schema accepts only matching strict channel-shaped release fields', async () => {
	const root = new URL('../../', import.meta.url);
	const schema = JSON.parse(
		await readFile(new URL('schemas/compiler-docs-lock-v1.schema.json', root), 'utf8'),
	);
	const current = JSON.parse(
		await readFile(new URL('src/content/compiler-data/compiler-docs.lock.json', root), 'utf8'),
	);
	const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
	const release = structuredClone(current);
	release.channel = '0.1.0';
	release.bundlePath = 'src/content/compiler-data/0.1.0';
	release.source.ref = 'refs/tags/v0.1.0';
	release.documents = release.documents.map((document) => ({
		...document,
		route: document.route.replace('/compiler/next/', '/compiler/0.1.0/'),
	}));
	assert.equal(validate(release), true, JSON.stringify(validate.errors));
	for (const mutate of [
		(value) => (value.channel = '0.1'),
		(value) => (value.bundlePath = 'src/content/compiler-data/0.1'),
		(value) => (value.source.ref = 'refs/heads/main'),
		(value) => (value.documents[0].route = '/reference/compiler/0.1.0.bad/reference/example/'),
	]) {
		const invalid = structuredClone(release);
		mutate(invalid);
		assert.equal(validate(invalid), false);
	}
});

test('a channel-scoped sync preserves another registered generated subtree', async (context) => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'zryna-channel-sync-'));
	context.after(() => rm(root, { recursive: true, force: true }));
	const nextRoot = path.join(root, 'src/content/docs/reference/compiler/next');
	const releaseRoot = path.join(root, 'src/content/docs/reference/compiler/0.1.0');
	await mkdir(nextRoot, { recursive: true });
	await mkdir(releaseRoot, { recursive: true });
	await writeFile(path.join(nextRoot, 'stale.md'), 'stale\n');
	await writeFile(path.join(releaseRoot, 'preserved.md'), 'preserved\n');
	await writeGeneratedCompilerDocs({
		root,
		generatedRoot: nextRoot,
		generatedPath: 'src/content/docs/reference/compiler/next',
		files: new Map([['fresh.md', Buffer.from('fresh\n')]]),
	});
	assert.equal(await readFile(path.join(nextRoot, 'fresh.md'), 'utf8'), 'fresh\n');
	assert.equal(await readFile(path.join(releaseRoot, 'preserved.md'), 'utf8'), 'preserved\n');
});
