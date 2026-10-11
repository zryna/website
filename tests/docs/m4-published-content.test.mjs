import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	boundedPublishedBytes,
	checkerSourceIdentity,
	extractSupport,
	hashResponse,
	verifyRenderedM4Support,
	verifyGeneratedM4Import,
} from '../../tools/docs/m4-published-content.mjs';

function projection() {
	return {
		schema: 'zryna.m4.support.v1',
		authority: 'static-contract',
		registrySha256: 'a'.repeat(64),
		authenticatedEvidence: 'not-evaluated',
		rows: Array.from({ length: 12 }, (_, id) => ({
			id: `independent-row-${id}`,
			host: { os: id % 2 ? 'win32' : 'linux', architecture: 'x64', baseline: 'bounded-fixture' },
			limits: [{ id: 'bytes', maximum: 4096 }],
			artifacts: ['exact.component.wasm'],
			capabilities: { effective: [] },
			authenticatedExecution: 'not-evaluated',
		})),
		exclusions: [
			'installed-server-status',
			'installed-server-clock',
			'installed-browser',
			'immutable-beta-h1',
		],
	};
}
const markdown = (value) =>
	`zryna.m4.support.v1:begin\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\nzryna.m4.support.v1:end`;
const html = (value) =>
	`<main><pre><code>${JSON.stringify(value, null, 2).replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</code></pre></main>`;

test('Expressive Code line wrappers preserve canonical support JSON exactly', () => {
	const source = projection();
	const expected = extractSupport(markdown(source));
	const lines = JSON.stringify(source, null, 2)
		.split('\n')
		.map(
			(line) =>
				`<div class="ec-line"><div class="code"><span>${line.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</span></div></div>`,
		)
		.join('');
	const rendered = `<main><pre><code>${lines}</code></pre></main>`;
	verifyRenderedM4Support(rendered, expected);
	assert.throws(() => verifyRenderedM4Support(rendered.replace('ec-line', 'wrong-line'), expected));
});

test('rendered support compares the complete authenticated projection, including exclusions and limits', () => {
	const expected = extractSupport(markdown(projection()));
	assert.deepEqual(verifyRenderedM4Support(html(projection()), expected), {
		registrySha256: 'a'.repeat(64),
		matrixSha256: hashResponse(Buffer.from(expected.canonical)),
	});
	for (const mutate of [
		(p) => {
			p.registrySha256 = 'b'.repeat(64);
		},
		(p) => {
			p.rows.pop();
		},
		(p) => {
			p.rows.push(structuredClone(p.rows[0]));
		},
		(p) => {
			p.rows[0].host.os = 'macos';
		},
		(p) => {
			p.rows[0].limits[0].maximum++;
		},
		(p) => {
			p.rows[0].artifacts = [];
		},
		(p) => {
			p.rows[0].capabilities.effective.push('filesystem');
		},
		(p) => {
			p.rows[0].authenticatedExecution = 'verified';
		},
		(p) => {
			p.exclusions.pop();
		},
	]) {
		const changed = projection();
		mutate(changed);
		assert.throws(() => verifyRenderedM4Support(html(changed), expected));
	}
	for (const altered of [
		html(projection()).replace('<pre>', '<pre hidden>'),
		html(projection()).replace('<pre>', '<pre aria-hidden="true">'),
		html(projection()).replaceAll('main', 'script'),
		html(projection()) + html(projection()),
		'<main>zryna.m4.support.v1</main>',
		html(projection()).replace('"schema":', '"schema" :'),
	])
		assert.throws(() => verifyRenderedM4Support(altered, expected));
});

test('source Markdown rejects duplicate markers, duplicate JSON keys and noncanonical JSON', () => {
	const source = markdown(projection());
	for (const changed of [
		source + source,
		source.replace('```json', '```js'),
		source.replace('"schema":', '"schema" :'),
		source.replace(
			'"schema": "zryna.m4.support.v1",',
			'"schema": "wrong",\n  "schema": "zryna.m4.support.v1",',
		),
	])
		assert.throws(() => extractSupport(changed));
});

test('published body bound checks declared and streamed bytes and preserves response identity', async () => {
	const content = Buffer.from('actual response bytes\n');
	const response = new Response(content);
	assert((await boundedPublishedBytes(response, 1024)).equals(content));
	await assert.rejects(() =>
		boundedPublishedBytes(new Response(content, { headers: { 'content-length': '2048' } }), 1024),
	);
	await assert.rejects(() => boundedPublishedBytes(new Response(content), 4));
	await assert.rejects(() =>
		boundedPublishedBytes(
			new Response(content, { headers: { 'content-length': 'invalid' } }),
			1024,
		),
	);
});

test('standalone published checker rejects stale, missing and extra generated imported files', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'm4-generated-import-'));
	const generatedRoot = path.join(root, 'src/content/docs/reference/compiler/next');
	const files = new Map([
		['index.md', Buffer.from('independent imported index\n')],
		['reference/m4-support.md', Buffer.from('independent authenticated support Markdown\n')],
	]);
	try {
		await mkdir(path.join(generatedRoot, 'reference'), { recursive: true });
		for (const [file, bytes] of files) await writeFile(path.join(generatedRoot, file), bytes);
		const capture = { root, generatedRoot, files };
		await verifyGeneratedM4Import(root, capture);
		await writeFile(path.join(generatedRoot, 'index.md'), 'stale generated index\n');
		await assert.rejects(() => verifyGeneratedM4Import(root, capture));
		await writeFile(path.join(generatedRoot, 'index.md'), files.get('index.md'));
		await writeFile(path.join(generatedRoot, 'unlisted.md'), 'extra content\n');
		await assert.rejects(() => verifyGeneratedM4Import(root, capture));
		await rm(path.join(generatedRoot, 'unlisted.md'));
		await rm(path.join(generatedRoot, 'reference/m4-support.md'));
		await assert.rejects(() => verifyGeneratedM4Import(root, capture));
		await assert.rejects(() =>
			verifyGeneratedM4Import(root, { ...capture, root: path.dirname(root) }),
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test('served checker binds a clean committed source and rejects untracked helpers', () => {
	const calls = [];
	const cleanGit = (command, args) => {
		assert.equal(command, 'git');
		calls.push(args);
		if (args[0] === 'status') return '';
		return args[1] === 'HEAD' ? 'a'.repeat(40) : 'b'.repeat(40);
	};
	assert.deepEqual(
		checkerSourceIdentity('--dist', '/without/git', () => {
			assert.fail('dist must remain Git-free');
		}),
		{ checkerWebsiteCommit: null, checkerWebsiteTree: null },
	);
	assert.deepEqual(checkerSourceIdentity('--origin', '/clean/checkout', cleanGit), {
		checkerWebsiteCommit: 'a'.repeat(40),
		checkerWebsiteTree: 'b'.repeat(40),
	});
	assert.deepEqual(calls[0], ['status', '--porcelain']);
	for (const dirty of [
		'?? tools/docs/m4-published-content.mjs\n',
		' M tools/docs/check-published-content.mjs\n',
	]) {
		assert.throws(
			() => checkerSourceIdentity('--origin', '/dirty/checkout', () => dirty),
			/clean checker source/,
		);
	}
});
