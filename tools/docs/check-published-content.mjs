import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PREFIX = '/reference/compiler/next/reference/';
export const CONTENT = new Map([
	[
		'/reference/compiler-status/',
		['data-ownership-v1', 'manifest v3', 'not production-ready', 'Windows native execution'],
	],
	[
		`${PREFIX}m3-public-profile/`,
		[
			'zryna-data-ownership-v1',
			'Linear32V1',
			'LinuxX8664V1',
			'zryna.trap.bounds-v1',
			'WASI',
			'Components',
			'scalar',
		],
	],
	[
		`${PREFIX}m3-getting-started/`,
		[
			'm3-pair-run-1',
			'javascript: i32 65',
			'javascript: i32 31',
			'javascript: i32 37',
			'corrected-move',
			'create-only',
			'BorrowMut<i32>',
			'clone(text)',
		],
	],
	[`${PREFIX}m3-conformance/`, ['15 scalar cases', '26 injected fault cases', 'M0-M2', 'manifest']],
]);

function visibleText(html) {
	function text(node) {
		if (['script', 'style'].includes(node.tagName)) return '';
		if (node.nodeName === '#text') return node.value;
		return (node.childNodes ?? []).map(text).join('');
	}
	return text(parse(html)).replace(/\s+/g, ' ');
}

export function verifyContent(route, html, sourceCommit, manifestDigest) {
	const text = visibleText(html);
	if (route.startsWith('/reference/compiler/next/') || route === '/reference/compiler-status/') {
		assert(text.includes(sourceCommit), `${route}: exact compiler commit missing`);
	}
	if (route === '/reference/compiler-status/') {
		assert(text.includes(manifestDigest), `${route}: authenticated manifest digest missing`);
	}
	for (const marker of CONTENT.get(route) ?? []) {
		assert(text.includes(marker), `${route}: required content missing: ${marker}`);
	}
}

export function verifyHeaders(headers) {
	for (const [name, value] of [
		['x-content-type-options', 'nosniff'],
		['x-frame-options', 'DENY'],
		['referrer-policy', 'strict-origin-when-cross-origin'],
		['permissions-policy', 'camera=(), microphone=(), geolocation=()'],
	])
		assert.equal(headers.get(name), value, `security header ${name}`);
}

async function run() {
	const [mode, origin] = process.argv.slice(2);
	assert(mode === '--dist' || (mode === '--origin' && origin), 'use --dist or --origin <URL>');
	const lock = JSON.parse(
		await readFile(path.join(ROOT, 'src/content/compiler-data/compiler-docs.lock.json'), 'utf8'),
	);
	const routes = [
		...new Set([
			'/',
			'/guides/getting-started/',
			'/guides/roadmap/',
			'/reference/compiler-status/',
			'/reference/architecture/',
			'/reference/documentation-bundles/',
			'/reference/compiler/next/',
			...CONTENT.keys(),
			...lock.documents.map((document) => document.route),
		]),
	];
	let observedHsts = null;
	for (const route of routes) {
		let html;
		if (mode === '--dist') {
			html = await readFile(path.join(ROOT, 'dist', route.slice(1), 'index.html'), 'utf8');
		} else {
			const url = new URL(route, origin);
			assert(['http:', 'https:'].includes(url.protocol), 'HTTP(S) origin required');
			const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
			assert.equal(response.status, 200, route);
			verifyHeaders(response.headers);
			observedHsts = response.headers.get('strict-transport-security');
			html = await response.text();
		}
		verifyContent(route, html, lock.source.commit, lock.manifestSha256);
	}
	if (mode === '--origin') {
		const response = await fetch(new URL('/definitely-missing', origin), {
			redirect: 'error',
			signal: AbortSignal.timeout(20000),
		});
		assert.equal(response.status, 404);
		verifyHeaders(response.headers);
	}
	if (mode === '--origin' && new URL(origin).protocol === 'https:') {
		const insecure = new URL('/', origin);
		insecure.protocol = 'http:';
		const redirect = await fetch(insecure, {
			redirect: 'manual',
			signal: AbortSignal.timeout(20000),
		});
		assert.equal(redirect.status, 308, 'HTTP must redirect permanently to HTTPS');
		assert.equal(
			new URL(redirect.headers.get('location'), insecure).href,
			new URL('/', origin).href,
		);
	}

	console.log(
		JSON.stringify({
			sourceCommit: lock.source.commit,
			manifestSha256: lock.manifestSha256,
			routes: routes.length,
			mode,
			origin: origin ?? null,
			result: 'passed',
			observedHsts,
		}),
	);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await run();
}
