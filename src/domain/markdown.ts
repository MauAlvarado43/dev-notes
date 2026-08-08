import MarkdownIt from 'markdown-it';

const SNIPPET_LENGTH = 100;
const SEARCH_TEXT_LENGTH = 50_000;

const markdown = new MarkdownIt({
  breaks: false,
  html: false,
  linkify: true,
  typographer: true
});

/** Renders note content to HTML. Raw HTML stays disabled so notes cannot inject markup. */
export function renderMarkdown(source: string): string {
  return markdown.render(source);
}

/** Strips Markdown syntax so a note can be searched and previewed as plain text. */
export function plainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, '').replace(/\s+/g, ' '))
    .replace(/!?(\[([^\]]*)\])\([^)]*\)/g, '$2')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Short preview shown under a note title in the sidebar. */
export function noteSnippet(source: string): string {
  return plainText(source).slice(0, SNIPPET_LENGTH);
}

/** Bounded plain text kept in the sidebar for client-side search. */
export function noteSearchText(source: string): string {
  return plainText(source).slice(0, SEARCH_TEXT_LENGTH);
}
