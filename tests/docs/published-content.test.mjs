import assert from 'node:assert/strict';
import test from 'node:test';
import {
	CONTENT,
	verifyContent,
	verifyHeaders,
	verifyHttpsRedirect,
} from '../../tools/docs/check-published-content.mjs';

test('rendered public content rejects stale provenance and missing M3 claims', () => {
	const commit = 'a'.repeat(40);
	const digest = 'b'.repeat(64);
	for (const [route, markers] of CONTENT) {
		const html = `<main>${commit} ${digest} ${markers.join(' ').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</main>`;
		verifyContent(route, html, commit, digest);
		assert.throws(() => verifyContent(route, html.replace(commit, 'c'.repeat(40)), commit, digest));
		for (const marker of markers) {
			const stripped = html.replace(marker.replaceAll('<', '&lt;').replaceAll('>', '&gt;'), '');
			assert.throws(() => verifyContent(route, stripped, commit, digest));
		}
	}
});

test('HTTPS verification accepts permanent redirects and rejects unsafe or temporary redirects', () => {
	const origin = 'https://zryna.com';
	for (const status of [301, 308]) {
		verifyHttpsRedirect(status, `${origin}/`, origin);
		for (const location of [
			null,
			'',
			'/',
			'http://zryna.com/',
			'https://example.com/',
			`${origin}/other`,
			`${origin}/?next=other`,
		])
			assert.throws(() => verifyHttpsRedirect(status, location, origin));
	}
	for (const status of [200, 302, 303, 307, 404])
		assert.throws(() => verifyHttpsRedirect(status, `${origin}/`, origin));
});

test('runtime verification rejects missing or weakened security headers', () => {
	const entries = {
		'x-content-type-options': 'nosniff',
		'x-frame-options': 'DENY',
		'referrer-policy': 'strict-origin-when-cross-origin',
		'permissions-policy': 'camera=(), microphone=(), geolocation=()',
	};
	verifyHeaders(new Headers(entries));
	for (const key of Object.keys(entries)) {
		const changed = new Headers(entries);
		changed.delete(key);
		assert.throws(() => verifyHeaders(changed));
	}
});

test('semantic-version routes require their own immutable compiler identity', () => {
	const commit = 'd'.repeat(40);
	const html = `<main>${commit}</main>`;
	verifyContent(
		'/reference/compiler/0.1.0/reference/example/',
		html,
		commit,
		'e'.repeat(64),
		'/reference/compiler/0.1.0/',
	);
	assert.throws(() =>
		verifyContent(
			'/reference/compiler/0.1.0/reference/example/',
			html.replace(commit, 'f'.repeat(40)),
			commit,
			'e'.repeat(64),
			'/reference/compiler/0.1.0/',
		),
	);
});
