import assert from 'node:assert/strict';
import test from 'node:test';
import { plainM4Support } from '../../tools/docs/plain-m4-support.mjs';

const sourceFilePath = '/checkout/src/content/docs/reference/compiler/next/reference/m4-support.md';
const value = {
	schema: 'zryna.m4.support.v1',
	example: '</code><script>not executable</script>',
	rows: [],
};
const canonical = `${JSON.stringify(value, null, 2)}\n`;
function render(overrides = {}) {
	const original = { type: 'element', tagName: 'figure', properties: {}, children: [] };
	const renderData = { blockAst: original };
	plainM4Support().hooks.postprocessRenderedBlock({
		codeBlock: {
			code: canonical.trimEnd(),
			language: 'json',
			parentDocument: { sourceFilePath },
			...overrides,
		},
		renderData,
	});
	return { original, block: renderData.blockAst };
}

test('only the canonical imported M4 matrix renders as one exact plaintext code block', () => {
	for (const source of [
		sourceFilePath,
		sourceFilePath.slice('/checkout/'.length),
		sourceFilePath.replaceAll('/', '\\'),
	]) {
		const { block } = render({ parentDocument: { sourceFilePath: source } });
		assert.equal(block.tagName, 'pre');
		assert.equal(block.children[0].tagName, 'code');
		assert.deepEqual(block.children[0].children, [{ type: 'text', value: canonical }]);
	}
});

test('other pages, languages and noncanonical or unrelated JSON retain normal rendering', () => {
	for (const change of [
		{ parentDocument: undefined },
		{ parentDocument: { sourceFilePath: sourceFilePath.replace('next/', '0.1.0/') } },
		{ parentDocument: { sourceFilePath: sourceFilePath.replace('m4-support.md', 'other.md') } },
		{ language: 'text' },
		{ code: '{bad JSON' },
		{ code: canonical.replace('zryna.m4.support.v1', 'other.schema') },
		{ code: canonical.replace('"schema":', '"schema" :') },
		{
			code: canonical.replace(
				'"schema": "zryna.m4.support.v1",',
				'"schema": "other",\n  "schema": "zryna.m4.support.v1",',
			),
		},
	]) {
		const { original, block } = render(change);
		assert.equal(block, original);
	}
});
