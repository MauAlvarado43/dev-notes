import assert from 'node:assert/strict';
import test from 'node:test';
import { noteSnippet, plainText, renderMarkdown } from '../src/domain/markdown';

test('rendering keeps raw HTML out of the output', () => {
  const rendered = renderMarkdown('# Title\n\n<script>alert(1)</script>');
  assert.match(rendered, /<h1>Title<\/h1>/);
  assert.ok(!rendered.includes('<script>'));
});

test('plain text drops Markdown syntax, links, and code fences', () => {
  const source = '# Title\n\n- **bold** item\n- [docs](https://example.com)\n\n```bash\nnpm run build\n```';
  assert.equal(plainText(source), 'Title - bold item - docs npm run build');
});

test('a snippet is bounded so the sidebar payload stays small', () => {
  assert.ok(noteSnippet('word '.repeat(200)).length <= 100);
});
