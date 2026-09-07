import assert from 'node:assert/strict';
import test from 'node:test';
import {
	CONTENT,
	verifyContent,
	verifyHeaders,
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
