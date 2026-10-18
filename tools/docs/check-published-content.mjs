import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { loadRegisteredCompilerLocks } from './compiler-imports.mjs';
import { readBoundedRegular } from './check-bundle.mjs';
import {
	M4_SUPPORT_ROUTE,
	M4_CONFORMANCE_ROUTE,
	MAX_PUBLISHED_HTML_BYTES,
	checkerSourceIdentity,
	boundedPublishedBytes,
	hashResponse,
	loadM4PublishedExpectation,
	verifyRenderedM4Support,
} from './m4-published-content.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PREFIX = '/reference/compiler/next/reference/';
const TUTORIAL_SOURCE_COMMIT = '841c8aee901782c9f7bf442bfe8eb2fe6b7f6446';
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
	[
		`${PREFIX}m6-tooling/`,
		[
			'zryna.m6-source-evidence.v2',
			'reviewed-source-v1',
			'4096 UTF-8 source bytes',
			'512 MiB',
			'1 GiB',
			'Unknown cleanup',
		],
	],
	[
		`${PREFIX}m6-reviewed-source-v2/`,
		[
			'v0.1.0-playground-compiler.2',
			'qualification candidate',
			'10-second whole operation',
			'5-second whole operation',
			'2-second deadline',
		],
	],
	[
		`${PREFIX}m6-conformance/`,
		[
			'server/VSIX 0.5.0',
			'0.1.0-candidate.3',
			'one operation/no queue',
			'independent signature/provenance verification',
		],
	],
]);

export const M4_CONTENT = new Map([
	[M4_SUPPORT_ROUTE, ['static contract', 'not-evaluated', 'Runnable examples', 'M0–M3']],
	[
		M4_CONFORMANCE_ROUTE,
		['twelve primary rows', 'Exact-limit', 'live publication', 'not-evaluated'],
	],
	[
		`${PREFIX}browser-component-v1/`,
		['add(20, 22) === 42', 'browser-component-v1', 'create-only', 'cannot be preempted'],
	],
	[
		`${PREFIX}wasi-command-getting-started/`,
		['command-h1-v1', 'command-pure-1', 'installed-pure-1', '--grant-file', 'MODE'],
	],
	[
		'/reference/compiler/next/examples/wasi-command/',
		['ok(())', 'err(())', 'MODE', 'caller-private'],
	],
	[
		'/reference/compiler/next/examples/wasi-server-status/',
		['server-status-v1', '--listener-approval', 'empty', 'finite'],
	],
	[
		'/reference/compiler/next/examples/wasi-server-clock/',
		['server-clock-status-v1', 'local-clock-denied', 'local-clock-granted', 'C4201'],
	],
]);

export const TUTORIAL_CONTENT = new Map([
	['/tutorial/', ['Developer Preview', 'does not track', 'zryna/zryna#410']],
	['/tutorial/setup/', ['zryna 0.2.1', 'javascript: i32 12', 'package-locked']],
	['/tutorial/values-and-operators/', ['i32', 'bool', 'javascript: bool true']],
	['/tutorial/control-flow/', ['while', 'webassembly: i32 15', 'does not admit for']],
	['/tutorial/functions-and-modules/', ['import { triple }', 'javascript: i32 32']],
	['/tutorial/data-shapes/', ['ZrynaStruct', 'FixedArray<i32, 3>', 'ZrynaEnum']],
	['/tutorial/ownership/', ['clone(first)', 'ZRYNA-M3011']],
	['/tutorial/borrowing/', ['BorrowMut<i32>', 'ZRYNA-M3017']],
	['/tutorial/project/', ['finalScore', 'javascript: i32 15', 'zryna/zryna#410']],
]);

function visibleText(html) {
	function text(node) {
		if (['script', 'style'].includes(node.tagName)) return '';
		if (node.nodeName === '#text') return node.value;
		return (node.childNodes ?? []).map(text).join('');
	}
	return text(parse(html)).replace(/\s+/g, ' ');
}

export function verifyContent(
	route,
	html,
	sourceCommit,
	manifestDigest,
	rootRoute = '/reference/compiler/next/',
) {
	const text = visibleText(html);
	if (route.startsWith(rootRoute) || route === '/reference/compiler-status/') {
		assert(text.includes(sourceCommit), `${route}: exact compiler commit missing`);
	}
	if (route === '/reference/compiler-status/') {
		assert(text.includes(manifestDigest), `${route}: authenticated manifest digest missing`);
	}
	if (route.startsWith('/tutorial/')) {
		assert(text.includes('0.2.1'), `${route}: release version missing`);
		assert(text.includes(TUTORIAL_SOURCE_COMMIT), `${route}: release source commit missing`);
	}
	for (const marker of CONTENT.get(route) ?? []) {
		assert(text.includes(marker), `${route}: required content missing: ${marker}`);
	}
	for (const marker of M4_CONTENT.get(route) ?? []) {
		assert(text.includes(marker), `${route}: required M4 content missing: ${marker}`);
	}
	for (const marker of TUTORIAL_CONTENT.get(route) ?? []) {
		assert(text.includes(marker), `${route}: required tutorial content missing: ${marker}`);
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

export function verifyHttpsRedirect(status, location, origin) {
	assert([301, 308].includes(status), 'HTTP must redirect permanently to HTTPS');
	assert(typeof location === 'string' && location.length > 0, 'redirect location required');
	const destination = new URL('/', origin);
	assert.equal(destination.protocol, 'https:');
	const request = new URL(destination);
	request.protocol = 'http:';
	assert.equal(
		new URL(location, request).href,
		destination.href,
		'exact HTTPS destination required',
	);
}

async function run() {
	const [mode, origin] = process.argv.slice(2);
	assert(
		(mode === '--dist' && process.argv.length === 3) ||
			(mode === '--origin' && origin && process.argv.length === 4),
		'use --dist or --origin <URL>',
	);
	if (origin) {
		const base = new URL(origin);
		assert(
			!base.username && !base.password && !base.search && !base.hash && base.pathname === '/',
			'canonical origin without credentials',
		);
		assert(
			base.protocol === 'https:' ||
				(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)),
			'HTTPS required for deployed content',
		);
	}
	const imports = await loadRegisteredCompilerLocks(ROOT);
	const next = imports.find((entry) => entry.registration.channel === 'next');
	assert(next, 'the next compiler documentation channel must remain registered');
	const m4 = await loadM4PublishedExpectation(ROOT, next);
	const observedAt = new Date().toISOString();
	const responses = [];
	const { checkerWebsiteCommit, checkerWebsiteTree } = checkerSourceIdentity(mode, ROOT);
	const routes = [
		...new Set([
			'/',
			'/guides/getting-started/',
			'/guides/roadmap/',
			'/reference/compiler-status/',
			'/reference/architecture/',
			'/reference/documentation-bundles/',
			...TUTORIAL_CONTENT.keys(),
			...imports.map((entry) => entry.rootRoute),
			...CONTENT.keys(),
			...M4_CONTENT.keys(),
			M4_SUPPORT_ROUTE,
			M4_CONFORMANCE_ROUTE,
			...imports.flatMap((entry) => entry.lock.documents.map((document) => document.route)),
		]),
	];
	let observedHsts = null;
	let observedHttpRedirect = null;
	for (const route of routes) {
		let html;
		let bytes;
		if (mode === '--dist') {
			bytes = await readBoundedRegular(
				path.join(ROOT, 'dist', route.slice(1), 'index.html'),
				MAX_PUBLISHED_HTML_BYTES,
			);
			responses.push({
				route,
				status: null,
				url: null,
				bytes: bytes.length,
				sha256: hashResponse(bytes),
			});
		} else {
			const url = new URL(route, origin);
			assert(['http:', 'https:'].includes(url.protocol), 'HTTP(S) origin required');
			const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
			assert.equal(response.status, 200, route);
			verifyHeaders(response.headers);
			observedHsts = response.headers.get('strict-transport-security');
			assert(
				response.headers.get('content-type')?.split(';')[0] === 'text/html',
				'HTML response required',
			);
			bytes = await boundedPublishedBytes(response);
			responses.push({
				route,
				url: url.href,
				status: response.status,
				bytes: bytes.length,
				sha256: hashResponse(bytes),
			});
		}
		html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		if (route === M4_SUPPORT_ROUTE) verifyRenderedM4Support(html, m4);
		if (route === '/reference/documentation-bundles/') {
			const text = visibleText(html);
			for (const value of [
				m4.compilerCommit,
				m4.manifestSha256,
				m4.support.registrySha256,
				m4.matrixSha256,
			]) {
				assert(text.includes(value), 'exact authored compiler publication provenance');
			}
		}
		const imported = imports.find((entry) => route.startsWith(entry.rootRoute));
		const authority = imported ?? next;
		verifyContent(
			route,
			html,
			authority.lock.source.commit,
			authority.lock.manifestSha256,
			authority.rootRoute,
		);
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
		verifyHttpsRedirect(redirect.status, redirect.headers.get('location'), origin);
		observedHttpRedirect = { status: redirect.status, location: redirect.headers.get('location') };
	}

	console.log(
		JSON.stringify({
			sourceCommit: next.lock.source.commit,
			registrySha256: m4.support.registrySha256,
			matrixSha256: m4.matrixSha256,
			lockSha256: m4.lockSha256,
			observedAt,
			checkerWebsiteCommit,
			checkerWebsiteTree,
			observedDeployment: null,
			responses,
			manifestSha256: next.lock.manifestSha256,
			routes: routes.length,
			mode,
			origin: origin ?? null,
			result: 'passed',
			observedHsts,
			observedHttpRedirect,
		}),
	);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await run();
}
