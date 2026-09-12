import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const CHANNEL_PATTERN = /^(?:next|(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))$/;

export const COMPILER_IMPORTS = Object.freeze([
	Object.freeze({
		channel: 'next',
		lockPath: 'src/content/compiler-data/compiler-docs.lock.json',
	}),
]);

function fail(message) {
	throw new Error(`compiler documentation registry failed: ${message}`);
}

export function importPaths(channel) {
	if (!CHANNEL_PATTERN.test(channel)) fail(`unsafe channel ${JSON.stringify(channel)}`);
	return {
		bundlePath: `src/content/compiler-data/${channel}`,
		generatedPath: `src/content/docs/reference/compiler/${channel}`,
		rootRoute: `/reference/compiler/${channel}/`,
	};
}

export function validateCompilerImports(imports = COMPILER_IMPORTS) {
	if (!Array.isArray(imports) || imports.length === 0) fail('at least one import is required');
	const channels = new Set();
	const lockPaths = new Set();
	const bundlePaths = new Set();
	const generatedPaths = new Set();
	const rootRoutes = new Set();
	for (const registration of imports) {
		if (
			!registration ||
			Object.keys(registration).sort().join(',') !== 'channel,lockPath' ||
			typeof registration.channel !== 'string' ||
			typeof registration.lockPath !== 'string'
		) {
			fail('each import must contain exactly channel and lockPath strings');
		}
		const paths = importPaths(registration.channel);
		if (
			path.posix.isAbsolute(registration.lockPath) ||
			registration.lockPath.includes('\\') ||
			path.posix.normalize(registration.lockPath) !== registration.lockPath ||
			!/^src\/content\/compiler-data\/[A-Za-z0-9.-]+\.lock\.json$/.test(registration.lockPath)
		) {
			fail(`unsafe lock path ${JSON.stringify(registration.lockPath)}`);
		}
		for (const [values, value, label] of [
			[channels, registration.channel, 'channel'],
			[lockPaths, registration.lockPath.toLowerCase(), 'lock path'],
			[bundlePaths, paths.bundlePath.toLowerCase(), 'bundle path'],
			[generatedPaths, paths.generatedPath.toLowerCase(), 'generated path'],
			[rootRoutes, paths.rootRoute.toLowerCase(), 'root route'],
		]) {
			if (values.has(value)) fail(`duplicate ${label} ${JSON.stringify(value)}`);
			values.add(value);
		}
	}
	return imports;
}

export function validateImportIdentity(registration, lock) {
	const paths = importPaths(registration.channel);
	if (lock.channel !== registration.channel) fail('lock channel differs from its registration');
	if (lock.bundlePath !== paths.bundlePath) fail('lock bundle path differs from its channel');
	if (lock.channel === 'next') {
		if (lock.source?.ref !== 'refs/heads/main') fail('next lock must use refs/heads/main');
	} else {
		if (lock.source?.version !== lock.channel)
			fail('release lock version differs from its channel');
		if (lock.source?.ref !== `refs/tags/v${lock.channel}`) {
			fail('release lock ref differs from its channel');
		}
	}
	for (const document of lock.documents ?? []) {
		if (!document.route?.startsWith(paths.rootRoute)) {
			fail(`document route escapes channel ${registration.channel}`);
		}
	}
	return paths;
}

export async function loadRegisteredCompilerLocks(root, imports = COMPILER_IMPORTS) {
	validateCompilerImports(imports);
	const locks = [];
	const routes = new Set();
	for (const registration of imports) {
		const lock = JSON.parse(
			await readFile(path.join(root, ...registration.lockPath.split('/')), 'utf8'),
		);
		const paths = validateImportIdentity(registration, lock);
		for (const document of lock.documents) {
			const folded = document.route.toLowerCase();
			if (routes.has(folded)) fail(`duplicate document route ${JSON.stringify(document.route)}`);
			routes.add(folded);
		}
		locks.push({ registration, lock, ...paths });
	}
	return locks;
}
