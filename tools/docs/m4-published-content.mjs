import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { parse } from 'parse5';
import { assertSafeGeneratedRoot, buildAllExpectedCompilerDocs } from './import-bundle.mjs';
import { captureValidatedDocsBundle, readBoundedRegular } from './check-bundle.mjs';

export const M4_SUPPORT_ROUTE = '/reference/compiler/next/reference/m4-support/';
export const M4_CONFORMANCE_ROUTE = '/reference/compiler/next/reference/m4-conformance/';
export const hashResponse = (bytes) => createHash('sha256').update(bytes).digest('hex');
const BEGIN = 'zryna.m4.support.v1:begin';
const END = 'zryna.m4.support.v1:end';
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_PUBLISHED_HTML_BYTES = 2 * 1024 * 1024;

export function checkerSourceIdentity(mode, root, run = execFileSync) {
	if (mode === '--dist') return { checkerWebsiteCommit: null, checkerWebsiteTree: null };
	assert.equal(mode, '--origin');
	const git = (args) => run('git', args, { cwd: root, encoding: 'utf8' }).trim();
	assert.equal(
		git(['status', '--porcelain']),
		'',
		'clean checker source including untracked files',
	);
	const checkerWebsiteCommit = git(['rev-parse', 'HEAD']);
	const checkerWebsiteTree = git(['rev-parse', 'HEAD^{tree}']);
	assert.match(checkerWebsiteCommit, /^[a-f0-9]{40}$/u);
	assert.match(checkerWebsiteTree, /^[a-f0-9]{40}$/u);
	return { checkerWebsiteCommit, checkerWebsiteTree };
}

export function extractSupport(markdown) {
	assert.equal(markdown.split(BEGIN).length, 2, 'one support start marker');
	assert.equal(markdown.split(END).length, 2, 'one support end marker');
	assert(markdown.indexOf(BEGIN) < markdown.indexOf(END), 'support marker order');
	const body = markdown.split(BEGIN)[1].split(END)[0];
	const match = /^\n\n```json\n([\s\S]*\n)```\n\n$/u.exec(body);
	assert(match, 'canonical support JSON fence');
	const support = JSON.parse(match[1]);
	assert.equal(match[1], `${JSON.stringify(support, null, 2)}\n`, 'canonical support JSON');
	assert.equal(support.schema, 'zryna.m4.support.v1');
	assert.equal(support.authority, 'static-contract');
	assert.equal(support.authenticatedEvidence, 'not-evaluated');
	assert.match(support.registrySha256, /^[a-f0-9]{64}$/u);
	assert.equal(support.rows.length, 12, 'complete fixed support rows');
	assert.equal(new Set(support.rows.map((row) => row.id)).size, 12, 'unique support rows');
	for (const row of support.rows) assert.equal(row.authenticatedExecution, 'not-evaluated');
	return { support, canonical: match[1], matrixSha256: hashResponse(Buffer.from(match[1])) };
}

export async function verifyGeneratedM4Import(root, capture) {
	assert.equal(path.resolve(capture.root), path.resolve(root), 'exact importer checkout');
	await assertSafeGeneratedRoot(root, capture.generatedRoot);
	const actual = [];
	let directories = 0;
	async function list(relative = '', depth = 0) {
		assert(depth <= 16 && ++directories <= 256, 'bounded generated directory inventory');
		const entries = await readdir(path.join(capture.generatedRoot, relative), {
			withFileTypes: true,
		});
		assert(entries.length <= 1024, 'bounded generated directory entries');
		for (const entry of entries) {
			assert(
				!entry.isSymbolicLink() && (entry.isFile() || entry.isDirectory()),
				'safe generated entry',
			);
			const child = relative ? `${relative}/${entry.name}` : entry.name;
			if (entry.isDirectory()) await list(child, depth + 1);
			else {
				assert(actual.length < 1024, 'bounded generated file count');
				actual.push(child);
			}
		}
	}
	await list();
	assert.deepEqual(
		actual.sort(),
		[...capture.files.keys()].sort(),
		'exact generated imported file inventory',
	);
	for (const [file, expected] of capture.files) {
		const bytes = await readBoundedRegular(
			path.join(capture.generatedRoot, file),
			MAX_DOCUMENT_BYTES,
		);
		assert(bytes.equals(expected), `exact generated import bytes: ${file}`);
	}
}

export async function loadM4PublishedExpectation(root, next) {
	const [checkedImport] = await buildAllExpectedCompilerDocs([next.registration]);
	assert(checkedImport, 'checked next import capture');
	assert.deepEqual(checkedImport.lock, next.lock, 'full canonical lock validation');
	await verifyGeneratedM4Import(root, checkedImport);
	const lockBytes = await readBoundedRegular(
		path.join(root, next.registration.lockPath),
		1024 * 1024,
	);
	const bundle = await captureValidatedDocsBundle(path.join(root, next.lock.bundlePath), {
		expectedManifestSha256: next.lock.manifestSha256,
		expectedChannel: 'next',
		expectedSourceCommit: next.lock.source.commit,
		expectedSourceRef: 'refs/heads/main',
	});
	assert.deepEqual(bundle.diagnostics, [], 'complete authenticated next bundle required');
	assert.deepEqual(bundle.manifest.source, next.lock.source, 'exact lock source');
	const supportDoc = bundle.manifest.documents.find(
		(doc) => doc.path === 'documents/reference/m4-support.md',
	);
	assert(supportDoc, 'M4 support must be in the authenticated Markdown bundle');
	const locked = next.lock.documents.find((doc) => doc.id === supportDoc.id);
	assert.equal(locked?.route, M4_SUPPORT_ROUTE, 'exact locked support route');
	assert(
		next.lock.documents.some((doc) => doc.route === M4_CONFORMANCE_ROUTE),
		'locked conformance route',
	);
	const markdown = bundle.documents.get(supportDoc.path);
	assert(
		markdown && markdown.length <= MAX_DOCUMENT_BYTES,
		'bounded authenticated captured support bytes',
	);
	assert.equal(hashResponse(markdown), supportDoc.sha256, 'captured support content identity');
	return {
		...extractSupport(new TextDecoder('utf-8', { fatal: true }).decode(markdown)),
		lockSha256: hashResponse(lockBytes),
		compilerCommit: next.lock.source.commit,
		manifestSha256: next.lock.manifestSha256,
	};
}

function codeTexts(html) {
	assert(Buffer.byteLength(html) <= MAX_PUBLISHED_HTML_BYTES, 'bounded rendered content required');
	const result = [];
	function text(node) {
		if (node.nodeName === '#text') return node.value;
		const content = (node.childNodes ?? []).map(text).join('');
		const line =
			node.tagName === 'div' &&
			(node.attrs ?? []).some(
				(attr) => attr.name === 'class' && attr.value.split(/\s+/u).includes('ec-line'),
			);
		return line ? `${content}\n` : content;
	}
	function walk(node, inMain = false, hidden = false) {
		const attrs = new Map((node.attrs ?? []).map((attr) => [attr.name, attr.value]));
		const invisible =
			hidden ||
			attrs.has('hidden') ||
			attrs.get('aria-hidden') === 'true' ||
			/(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$))/iu.test(
				attrs.get('style') ?? '',
			) ||
			['script', 'style', 'template'].includes(node.tagName);
		const main = inMain || node.tagName === 'main';
		if (main && !invisible && node.tagName === 'code') result.push(text(node));
		for (const child of node.childNodes ?? []) walk(child, main, invisible);
	}
	walk(parse(html));
	return result;
}

export function verifyRenderedM4Support(html, expected) {
	const candidates = codeTexts(html).filter((text) => text.includes('zryna.m4.support.v1'));
	assert.equal(candidates.length, 1, 'one visible M4 support JSON block');
	const bytes = candidates[0].endsWith('\n') ? candidates[0] : `${candidates[0]}\n`;
	assert.equal(bytes, expected.canonical, 'complete canonical registry support equality');
	assert.equal(
		JSON.parse(bytes).registrySha256,
		expected.support.registrySha256,
		'registry digest equality',
	);
	return { registrySha256: expected.support.registrySha256, matrixSha256: expected.matrixSha256 };
}

export async function boundedPublishedBytes(response, maximum = MAX_PUBLISHED_HTML_BYTES) {
	const length = response.headers.get('content-length');
	assert(
		length === null || (/^\d+$/u.test(length) && Number(length) <= maximum),
		'response size bound',
	);
	const chunks = [];
	let count = 0;
	const reader = response.body.getReader();
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			count += value.byteLength;
			assert(count <= maximum, 'streamed response size bound');
			chunks.push(Buffer.from(value));
		}
	} finally {
		await reader.cancel();
	}
	return Buffer.concat(chunks, count);
}
