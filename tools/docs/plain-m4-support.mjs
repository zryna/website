const SUPPORT_SOURCE = 'src/content/docs/reference/compiler/next/reference/m4-support.md';

// Only the complete imported M4 matrix needs plaintext rendering. Other fences keep highlighting.
export function plainM4Support() {
	return {
		name: 'Complete M4 support JSON',
		hooks: {
			postprocessRenderedBlock({ codeBlock, renderData }) {
				const source = codeBlock.parentDocument?.sourceFilePath?.replaceAll('\\', '/');
				if (source !== SUPPORT_SOURCE && !source?.endsWith(`/${SUPPORT_SOURCE}`)) return;
				if (codeBlock.language !== 'json') return;
				let value;
				try {
					value = JSON.parse(codeBlock.code);
				} catch {
					return;
				}
				if (value?.schema !== 'zryna.m4.support.v1') return;
				const canonical = `${JSON.stringify(value, null, 2)}\n`;
				if (codeBlock.code !== canonical && `${codeBlock.code}\n` !== canonical) return;
				renderData.blockAst = {
					type: 'element',
					tagName: 'pre',
					properties: { className: ['m4-support-json'], ariaLabel: 'Complete M4 support matrix' },
					children: [
						{
							type: 'element',
							tagName: 'code',
							properties: { className: ['language-json'] },
							children: [{ type: 'text', value: canonical }],
						},
					],
				};
			},
		},
	};
}
