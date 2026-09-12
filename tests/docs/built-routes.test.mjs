import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkBuiltRoutes } from '../../tools/docs/check-built-routes.mjs';

async function write(root, relative, content) {
	const destination = path.join(root, ...relative.split('/'));
	await mkdir(path.dirname(destination), { recursive: true });
	await writeFile(destination, content);
}

async function fixture() {
	const root = await mkdtemp(path.join(os.tmpdir(), 'zryna-routes-'));
	await write(
		root,
		'index.html',
		'<html><head><link rel="canonical" href="https://zryna.com/"></head><body id="top"><a href="/guide/#section">Guide</a><img src="/asset.svg"></body></html>',
	);
	await write(
		root,
		'guide/index.html',
		'<html><body><h1 id="section">Guide</h1><a href="../">Home</a></body></html>',
	);
	await write(
		root,
		'reference/compiler/next/index.html',
		'<html><body><a href="/reference/compiler/next/status/current/">Status</a></body></html>',
	);
	await write(
		root,
		'reference/compiler/next/status/current/index.html',
		'<html><body><a href="/#top">Home</a></body></html>',
	);
	await write(root, '404.html', '<html><body>Missing</body></html>');
	await write(root, 'asset.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
	return root;
}

const options = {
	authoredRoutes: ['/', '/guide/'],
	compilerRoutes: ['/reference/compiler/next/status/current/'],
};

test('accepts the exact route inventory and resolves local targets and fragments', async (context) => {
	const root = await fixture();
	context.after(() => rm(root, { recursive: true, force: true }));
	assert.deepEqual(await checkBuiltRoutes({ distRoot: root, ...options }), []);
});

test('reports missing, extra, broken, and fragment failures deterministically', async (context) => {
	const root = await fixture();
	context.after(() => rm(root, { recursive: true, force: true }));
	await rm(path.join(root, 'guide'), { recursive: true });
	await write(
		root,
		'extra/index.html',
		'<a href="/missing/">Missing</a><a href="/#absent">Bad</a>',
	);
	const diagnostics = await checkBuiltRoutes({ distRoot: root, ...options });
	assert.deepEqual(
		diagnostics,
		[...diagnostics].sort((left, right) => Buffer.from(left).compare(Buffer.from(right))),
	);
	assert(diagnostics.some((item) => item === 'guide/index.html: expected HTML route is missing'));
	assert(diagnostics.some((item) => item === 'extra/index.html: unexpected HTML route'));
	assert(diagnostics.some((item) => item.includes('broken href')));
	assert(diagnostics.some((item) => item.includes('missing fragment')));
});

test('rejects symlinks and unsafe local URLs', async (context) => {
	const root = await fixture();
	context.after(() => rm(root, { recursive: true, force: true }));
	await write(root, 'index.html', '<a href="//example.com/path">Unsafe</a>');
	let linked = false;
	try {
		await symlink(path.join(root, 'asset.svg'), path.join(root, 'linked.svg'));
		linked = true;
	} catch (error) {
		if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
	}
	if (linked) await assert.rejects(checkBuiltRoutes({ distRoot: root, ...options }), /symlink/);
	else {
		const diagnostics = await checkBuiltRoutes({ distRoot: root, ...options });
		assert(diagnostics.some((item) => item.includes('protocol-relative URLs are forbidden')));
	}
});

test('checks canonical targets except for the static 404 fallback', async (context) => {
	const root = await fixture();
	context.after(() => rm(root, { recursive: true, force: true }));
	await write(
		root,
		'index.html',
		'<html><head><link rel="canonical" href="https://zryna.com/missing/"></head><body></body></html>',
	);
	await write(
		root,
		'404.html',
		'<html><head><link rel="canonical" href="https://zryna.com/404/"></head><body>Missing</body></html>',
	);
	const diagnostics = await checkBuiltRoutes({ distRoot: root, ...options });
	assert(diagnostics.some((item) => item.includes('broken href "https://zryna.com/missing/"')));
	assert(!diagnostics.some((item) => item.includes('https://zryna.com/404/')));
});

test('accepts multiple explicit compiler channel roots without conflating their routes', async (context) => {
	const root = await fixture();
	context.after(() => rm(root, { recursive: true, force: true }));
	await write(
		root,
		'reference/compiler/0.1.0/index.html',
		'<html><body><a href="/reference/compiler/0.1.0/status/current/">Release status</a></body></html>',
	);
	await write(
		root,
		'reference/compiler/0.1.0/status/current/index.html',
		'<html><body><a href="/reference/compiler/next/status/current/">Next status</a></body></html>',
	);
	assert.deepEqual(
		await checkBuiltRoutes({
			distRoot: root,
			authoredRoutes: ['/', '/guide/'],
			compilerRootRoutes: ['/reference/compiler/next/', '/reference/compiler/0.1.0/'],
			compilerRoutes: [
				'/reference/compiler/next/status/current/',
				'/reference/compiler/0.1.0/status/current/',
			],
		}),
		[],
	);
});
