import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { captureValidatedDocsBundle, validateDocsBundle } from '../../tools/docs/check-bundle.mjs';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

function hash(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

function serialize(manifest) {
	return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
}

async function writeManifest(root, manifest, serializer = serialize) {
	const manifestBytes = serializer(manifest);
	const digest = hash(manifestBytes);
	await writeFile(path.join(root, 'manifest.json'), manifestBytes);
	await writeFile(path.join(root, 'manifest.sha256'), `${digest}  manifest.json\n`);
	return digest;
}

async function makeBundle() {
	const root = await mkdtemp(path.join(os.tmpdir(), 'zryna-docs-'));
	const documentPath = path.join(root, 'documents', 'language', 'overview.md');
	const document = Buffer.from('# Language overview\n');
	await mkdir(path.dirname(documentPath), { recursive: true });
	await writeFile(documentPath, document);

	const manifest = {
		schema: 'zryna.docs.bundle.v1',
		version: 1,
		channel: 'next',
		source: {
			repository: 'https://github.com/zryna/zryna',
			commit: COMMIT,
			ref: 'refs/heads/main',
			version: '0.1.0',
		},
		documents: [
			{
				id: 'language/overview',
				path: 'documents/language/overview.md',
				title: 'Language overview',
				bytes: document.byteLength,
				sha256: hash(document),
			},
		],
	};
	const digest = await writeManifest(root, manifest);
	return { root, manifest, digest, documentPath };
}

function expectations(digest, channel = 'next') {
	return {
		expectedManifestSha256: digest,
		expectedChannel: channel,
		expectedSourceCommit: COMMIT,
		expectedSourceRef: 'refs/heads/main',
	};
}

test('accepts an authenticated deterministic compiler documentation bundle', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	assert.deepEqual(await validateDocsBundle(bundle.root, expectations(bundle.digest)), []);
});

test('captures only bytes bound to the authenticated manifest', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const captured = await captureValidatedDocsBundle(bundle.root, expectations(bundle.digest));
	assert.deepEqual(captured.diagnostics, []);
	assert.deepEqual(captured.manifest, bundle.manifest);
	assert.deepEqual(
		captured.documents.get(bundle.manifest.documents[0].path),
		Buffer.from('# Language overview\n'),
	);
});

test('identical compiler input produces identical canonical manifest bytes', async (context) => {
	const first = await makeBundle();
	const second = await makeBundle();
	context.after(() => rm(first.root, { recursive: true, force: true }));
	context.after(() => rm(second.root, { recursive: true, force: true }));
	assert.equal(first.digest, second.digest);
	assert.deepEqual(
		await readFile(path.join(first.root, 'manifest.json')),
		await readFile(path.join(second.root, 'manifest.json')),
	);
});

test('rejects validation without out-of-band authenticity expectations', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const diagnostics = await validateDocsBundle(bundle.root);
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2000'));
});

test('rejects tampered compiler documentation', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await writeFile(bundle.documentPath, '# Changed\n');
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2007'));
});

test('rejects a fully rehashed forged bundle through the authenticated digest', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const changed = Buffer.from('# Forged\n');
	await writeFile(bundle.documentPath, changed);
	bundle.manifest.documents[0].bytes = changed.byteLength;
	bundle.manifest.documents[0].sha256 = hash(changed);
	await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2005'));
});

test('executes the JSON Schema and rejects unknown manifest fields', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	bundle.manifest.generatedAt = new Date(0).toISOString();
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2002'));
});

test('rejects empty documentation bundles through the schema', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	bundle.manifest.documents = [];
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2002'));
});

test('rejects non-canonical JSON even when its digest is authenticated', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const digest = await writeManifest(bundle.root, bundle.manifest, (manifest) =>
		Buffer.from(JSON.stringify(manifest)),
	);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2003'));
});

test('binds version channels to matching source versions and immutable tags', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	bundle.manifest.channel = '1.2.3';
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest, '1.2.3'));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2009'));
});

test('rejects unlisted files', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await writeFile(path.join(bundle.root, 'documents', 'surprise.md'), '# Surprise\n');
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2008'));
});

test('rejects an oversized manifest before parsing it', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const oversized = Buffer.alloc(1024 * 1024 + 1, 0x20);
	await writeFile(path.join(bundle.root, 'manifest.json'), oversized);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(hash(oversized)));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2001'));
});

test('rejects declared document totals above the global byte budget', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	bundle.manifest.documents = Array.from({ length: 17 }, (_value, index) => ({
		id: `language/page-${String(index).padStart(2, '0')}`,
		path: `documents/language/page-${String(index).padStart(2, '0')}.md`,
		title: `Page ${index}`,
		bytes: 2 * 1024 * 1024,
		sha256: '0'.repeat(64),
	}));
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2010'));
});

test('rejects checksum files above the bounded checksum size', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await writeFile(path.join(bundle.root, 'manifest.sha256'), Buffer.alloc(129, 0x61));
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2004'));
});

test('rejects individual documents above the per-document byte budget', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const oversized = Buffer.alloc(2 * 1024 * 1024 + 1, 0x61);
	await writeFile(bundle.documentPath, oversized);
	bundle.manifest.documents[0].bytes = 2 * 1024 * 1024;
	bundle.manifest.documents[0].sha256 = hash(oversized);
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2006'));
});

test('rejects actual aggregate document bytes above the global budget', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await rm(path.join(bundle.root, 'documents'), { recursive: true, force: true });
	const content = Buffer.alloc(1_980_000, 0x61);
	bundle.manifest.documents = Array.from({ length: 17 }, (_value, index) => {
		const suffix = String(index).padStart(2, '0');
		return {
			id: `language/page-${suffix}`,
			path: `documents/language/page-${suffix}.md`,
			title: `Page ${index}`,
			bytes: 0,
			sha256: hash(content),
		};
	});
	await mkdir(path.join(bundle.root, 'documents', 'language'), { recursive: true });
	await Promise.all(
		bundle.manifest.documents.map((document) =>
			writeFile(path.join(bundle.root, ...document.path.split('/')), content),
		),
	);
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(
		diagnostics.some(
			(item) => item.code === 'ZWEB-D2006' && item.message.includes('aggregate document budget'),
		),
	);
});

test('rejects bundles above the global entry budget', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await Promise.all(
		Array.from({ length: 2048 }, (_value, index) =>
			writeFile(path.join(bundle.root, `extra-${String(index).padStart(4, '0')}.txt`), ''),
		),
	);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2010' && item.message.includes('entry')));
});

test('rejects bundles above the global directory budget', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await Promise.all(
		Array.from({ length: 254 }, (_value, index) =>
			mkdir(path.join(bundle.root, `extra-${String(index).padStart(3, '0')}`)),
		),
	);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(
		diagnostics.some((item) => item.code === 'ZWEB-D2010' && item.message.includes('directory')),
	);
});

test('rejects bundles above the global depth budget', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await mkdir(
		path.join(bundle.root, 'deep', ...Array.from({ length: 17 }, (_value, index) => `${index}`)),
		{ recursive: true },
	);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2010' && item.message.includes('depth')));
});

test('rejects symlinked bundle entries', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const target = path.join(path.dirname(bundle.documentPath), 'target.md');
	await writeFile(target, '# Target\n');
	await rm(bundle.documentPath);
	try {
		await symlink(target, bundle.documentPath, 'file');
	} catch (error) {
		if (error.code === 'EPERM' || error.code === 'EACCES') {
			context.skip('this Windows host does not permit creating test symlinks');
			return;
		}
		throw error;
	}
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2008'));
});

test('rejects invalid UTF-8 document bytes', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const invalid = Buffer.from([0xc3, 0x28]);
	await writeFile(bundle.documentPath, invalid);
	bundle.manifest.documents[0].bytes = invalid.byteLength;
	bundle.manifest.documents[0].sha256 = hash(invalid);
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2006'));
});

test('rejects listed documents that are missing from the bundle', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	await rm(bundle.documentPath);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2006'));
});

test('rejects duplicate document ids and paths', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	bundle.manifest.documents.push({ ...bundle.manifest.documents[0] });
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(
		diagnostics.some(
			(item) => item.code === 'ZWEB-D2003' && item.message.includes('must be unique'),
		),
	);
});

test('rejects document manifests that are not ASCII-sorted by path', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const secondPath = path.join(bundle.root, 'documents', 'language', 'a.md');
	const second = Buffer.from('# A\n');
	await writeFile(secondPath, second);
	bundle.manifest.documents.push({
		id: 'language/a',
		path: 'documents/language/a.md',
		title: 'A',
		bytes: second.byteLength,
		sha256: hash(second),
	});
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(
		diagnostics.some((item) => item.code === 'ZWEB-D2003' && item.message.includes('ASCII-sorted')),
	);
});

test('rejects bundles that do not match the authenticated channel', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const diagnostics = await validateDocsBundle(bundle.root, expectations(bundle.digest, '1.2.3'));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2009'));
});

test('rejects bundles that do not match the authenticated commit or ref', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const commitDiagnostics = await validateDocsBundle(bundle.root, {
		...expectations(bundle.digest),
		expectedSourceCommit: '1'.repeat(40),
	});
	assert(commitDiagnostics.some((item) => item.code === 'ZWEB-D2009'));
	const refDiagnostics = await validateDocsBundle(bundle.root, {
		...expectations(bundle.digest),
		expectedSourceRef: 'refs/heads/replaced',
	});
	assert(refDiagnostics.some((item) => item.code === 'ZWEB-D2009'));
});

test('rejects next bundles exported from a non-main ref', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	bundle.manifest.source.ref = 'refs/tags/v0.1.0';
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const diagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(diagnostics.some((item) => item.code === 'ZWEB-D2009'));
});

test('rejects SemVer numeric prerelease identifiers with leading zeroes', async (context) => {
	const bundle = await makeBundle();
	context.after(() => rm(bundle.root, { recursive: true, force: true }));
	const runtimeDiagnostics = await validateDocsBundle(
		bundle.root,
		expectations(bundle.digest, '1.2.3-01'),
	);
	assert(runtimeDiagnostics.some((item) => item.code === 'ZWEB-D2000'));

	bundle.manifest.source.version = '1.2.3-alpha.01';
	const digest = await writeManifest(bundle.root, bundle.manifest);
	const schemaDiagnostics = await validateDocsBundle(bundle.root, expectations(digest));
	assert(schemaDiagnostics.some((item) => item.code === 'ZWEB-D2002'));
});
