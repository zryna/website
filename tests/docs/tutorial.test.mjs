import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const releaseCommit = '841c8aee901782c9f7bf442bfe8eb2fe6b7f6446';
const tutorialDirectory = path.join(root, 'src', 'content', 'docs', 'tutorial');
const lessonFiles = [
	'index.md',
	'setup.md',
	'values-and-operators.md',
	'control-flow.md',
	'functions-and-modules.md',
	'data-shapes.md',
	'ownership.md',
	'borrowing.md',
	'project.md',
];

test('tutorial lessons retain the exact release identity and honest execution boundary', async () => {
	const lessons = await Promise.all(
		lessonFiles.map((file) => readFile(path.join(tutorialDirectory, file), 'utf8')),
	);
	for (const [index, lesson] of lessons.entries()) {
		assert(lesson.includes('0.2.1'), `${lessonFiles[index]}: release version`);
		assert(lesson.includes(releaseCommit), `${lessonFiles[index]}: release commit`);
		assert(!/\beval\s*\(/.test(lesson), `${lessonFiles[index]}: simulated evaluation`);
	}
	assert(lessons[0].includes('zryna/zryna/issues/410'));
	assert(lessons[0].includes('does **not** promise classes, constructors, inheritance'));
	assert(lessons[2].includes('This preview does not admit division, remainder'));
	assert(lessons[3].includes('does not admit `for`, `break`, `continue`'));
});

test('tutorial sidebar preserves exact lesson order before Learn and Reference', async () => {
	const config = await readFile(path.join(root, 'astro.config.mjs'), 'utf8');
	let cursor = -1;
	for (const slug of [
		"slug: 'tutorial'",
		"slug: 'tutorial/setup'",
		"slug: 'tutorial/values-and-operators'",
		"slug: 'tutorial/control-flow'",
		"slug: 'tutorial/functions-and-modules'",
		"slug: 'tutorial/data-shapes'",
		"slug: 'tutorial/ownership'",
		"slug: 'tutorial/borrowing'",
		"slug: 'tutorial/project'",
	]) {
		const next = config.indexOf(slug, cursor + 1);
		assert(next > cursor, `missing or unordered ${slug}`);
		cursor = next;
	}
	assert(config.indexOf("label: 'Learn'") > cursor);
	assert(config.indexOf("label: 'Reference'") > config.indexOf("label: 'Learn'"));
});

for (const project of ['tutorial-control', 'tutorial-ownership']) {
	test(`${project} starter files match their package identity`, async () => {
		const projectRoot = path.join(root, 'public', 'tutorial', 'projects', project);
		const manifest = JSON.parse(
			await readFile(path.join(projectRoot, 'zryna.package.json'), 'utf8'),
		);
		const lock = JSON.parse(await readFile(path.join(projectRoot, 'zryna.lock.json'), 'utf8'));
		assert.equal(manifest.compatibility.compiler, '0.2.1');
		assert.equal(lock.compatibility.compiler, '0.2.1');
		assert.equal(lock.compatibility.profile, manifest.compatibility.profile);
		assert.deepEqual(
			manifest.files.map((file) => file.path),
			[...manifest.files.map((file) => file.path)].sort(),
		);
		for (const file of manifest.files) {
			assert.match(file.path, /^src\/[a-z][a-z-]*\.zry$/);
			const bytes = await readFile(path.join(projectRoot, ...file.path.split('/')));
			assert.equal(bytes.length, file.size, file.path);
			assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
		}
	});
}

test('the downloadable tutorial workspace is present and bounded', async () => {
	const archive = await stat(path.join(root, 'public', 'tutorial', 'zryna-tutorial-0.2.1.zip'));
	assert(archive.isFile());
	assert(archive.size > 0 && archive.size < 1024 * 1024);
});
