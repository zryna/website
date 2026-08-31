import { lstat, opendir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'parse5';

const MAX_ENTRIES = 4096;
const MAX_DEPTH = 16;
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const SITE = 'https://zryna.com';
const AUTHORED_ROUTES = [
	'/',
	'/guides/getting-started/',
	'/guides/roadmap/',
	'/reference/architecture/',
	'/reference/compiler-status/',
	'/reference/documentation-bundles/',
];

function portablePath(value) {
	return value.split(path.sep).join('/');
}

function routeFile(route) {
	if (!/^\/(?:[a-z0-9][a-z0-9-]*\/)*$/.test(route)) {
		throw new Error(`unsafe route in authority: ${route}`);
	}
	return route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
}

function visitNodes(node, visitor) {
	visitor(node);
	for (const child of node.childNodes ?? []) visitNodes(child, visitor);
	if (node.content) visitNodes(node.content, visitor);
}

async function scan(root) {
	const files = new Map();
	let entries = 0;
	let totalBytes = 0;

	async function visit(relative, depth) {
		if (depth > MAX_DEPTH) throw new Error(`dist exceeds ${MAX_DEPTH} directory levels`);
		const directory = await opendir(path.join(root, relative));
		const children = [];
		for await (const entry of directory) children.push(entry.name);
		children.sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
		for (const name of children) {
			entries += 1;
			if (entries > MAX_ENTRIES) throw new Error(`dist exceeds ${MAX_ENTRIES} entries`);
			const child = relative ? path.join(relative, name) : name;
			const metadata = await lstat(path.join(root, child));
			if (metadata.isSymbolicLink() || (!metadata.isFile() && !metadata.isDirectory())) {
				throw new Error(`dist contains a symlink or special file: ${portablePath(child)}`);
			}
			if (metadata.isDirectory()) {
				await visit(child, depth + 1);
				continue;
			}
			totalBytes += metadata.size;
			if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`dist exceeds ${MAX_TOTAL_BYTES} bytes`);
			files.set(portablePath(child), metadata.size);
		}
	}

	await visit('', 0);
	return files;
}

function localTarget(raw, sourceRoute) {
	if (raw.startsWith('//')) throw new Error('protocol-relative URLs are forbidden');
	let url;
	try {
		url = new URL(raw, new URL(sourceRoute, SITE));
	} catch {
		throw new Error('URL is malformed');
	}
	if (url.origin !== SITE) return null;
	if (url.username || url.password) throw new Error('credentials are forbidden in local URLs');
	let pathname;
	try {
		pathname = decodeURIComponent(url.pathname);
	} catch {
		throw new Error('URL has invalid percent encoding');
	}
	if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0')) {
		throw new Error('local URL path is unsafe');
	}
	const relative = pathname.slice(1);
	const file = pathname.endsWith('/')
		? pathname === '/'
			? 'index.html'
			: `${relative}index.html`
		: relative;
	let fragment = '';
	try {
		fragment = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';
	} catch {
		throw new Error('URL fragment has invalid percent encoding');
	}
	return { file, fragment };
}

export async function checkBuiltRoutes({
	distRoot,
	compilerRoutes,
	authoredRoutes = AUTHORED_ROUTES,
}) {
	const files = await scan(distRoot);
	const expectedHtml = new Set([
		...authoredRoutes.map(routeFile),
		routeFile('/reference/compiler/next/'),
		...compilerRoutes.map(routeFile),
		'404.html',
	]);
	const actualHtml = new Set([...files.keys()].filter((file) => file.endsWith('.html')));
	const diagnostics = [];

	for (const file of [...expectedHtml].sort()) {
		if (!actualHtml.has(file)) diagnostics.push(`${file}: expected HTML route is missing`);
	}
	for (const file of [...actualHtml].sort()) {
		if (!expectedHtml.has(file)) diagnostics.push(`${file}: unexpected HTML route`);
	}

	const identifiers = new Map();
	const references = [];
	for (const file of [...actualHtml].sort()) {
		const size = files.get(file);
		if (size > MAX_HTML_BYTES) {
			diagnostics.push(`${file}: exceeds ${MAX_HTML_BYTES} HTML bytes`);
			continue;
		}
		const bytes = await readFile(path.join(distRoot, ...file.split('/')));
		let html;
		try {
			html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		} catch {
			diagnostics.push(`${file}: HTML is not valid UTF-8`);
			continue;
		}
		const document = parse(html);
		const ids = new Set();
		visitNodes(document, (node) => {
			const attributes = new Map(
				(node.attrs ?? []).map((attribute) => [attribute.name, attribute.value]),
			);
			for (const attribute of node.attrs ?? []) {
				if (attribute.name === 'id') ids.add(attribute.value);
				if (attribute.name === 'href' || attribute.name === 'src') {
					if (
						file === '404.html' &&
						node.tagName === 'link' &&
						attributes.get('rel') === 'canonical'
					)
						continue;
					references.push({ file, attribute: attribute.name, value: attribute.value });
				}
			}
		});
		identifiers.set(file, ids);
	}

	for (const reference of references) {
		const sourceRoute = reference.file === 'index.html' ? '/' : `/${reference.file.slice(0, -10)}`;
		let target;
		try {
			target = localTarget(reference.value, sourceRoute);
		} catch (error) {
			diagnostics.push(
				`${reference.file}: unsafe ${reference.attribute} ${JSON.stringify(reference.value)} (${error.message})`,
			);
			continue;
		}
		if (!target) continue;
		if (!target.file || !files.has(target.file)) {
			diagnostics.push(
				`${reference.file}: broken ${reference.attribute} ${JSON.stringify(reference.value)}`,
			);
			continue;
		}
		if (target.fragment && target.file.endsWith('.html')) {
			if (!identifiers.get(target.file)?.has(target.fragment)) {
				diagnostics.push(
					`${reference.file}: missing fragment ${JSON.stringify(target.fragment)} in ${target.file}`,
				);
			}
		}
	}

	diagnostics.sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
	return diagnostics;
}

async function main() {
	const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
	const lock = JSON.parse(
		await readFile(
			path.join(repositoryRoot, 'src/content/compiler-data/compiler-docs.lock.json'),
			'utf8',
		),
	);
	const diagnostics = await checkBuiltRoutes({
		distRoot: path.join(repositoryRoot, 'dist'),
		compilerRoutes: lock.documents.map((document) => document.route),
	});
	if (diagnostics.length > 0) {
		for (const diagnostic of diagnostics) console.error(diagnostic);
		process.exitCode = 1;
		return;
	}
	console.log(
		`Built route check passed: ${AUTHORED_ROUTES.length + lock.documents.length + 2} HTML routes.`,
	);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
	await main();
