import * as vscode from 'vscode';
import type { AppLocale } from '../../core/types';
import { nonce } from '../../core/utils';

export type WebviewBundle = 'sidebar' | 'editor' | 'board';

interface ShellOptions {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  locale: AppLocale;
  bundle: WebviewBundle;
  title: string;
  /** Notes may embed remote or inline images, which only the editor renders. */
  allowImages?: boolean;
  /** Data made available before the bundle runs, for views that must open with content immediately. */
  bootstrap?: unknown;
}

/**
 * HTML shell for both webviews. Markup and behavior live in the bundles built
 * from `src/presentation/webview`, so the host only wires assets and the CSP.
 */
export function webviewHtml({
  webview,
  extensionUri,
  locale,
  bundle,
  title,
  allowImages = false,
  bootstrap
}: ShellOptions): string {
  const token = nonce();
  const script = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', `${bundle}.js`));
  const style = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', `${bundle}.css`));
  const imageSources = allowImages ? `img-src ${webview.cspSource} https: data:; ` : '';
  const bootstrapScript = bootstrap === undefined
    ? ''
    : `<script nonce="${token}">globalThis.__DEV_NOTES_BOOTSTRAP__=${safeJson(bootstrap)};</script>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${imageSources}style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${token}';" />
  <link rel="stylesheet" href="${style}" />
  <title>${title}</title>
</head>
<body><div id="root"></div>${bootstrapScript}<script nonce="${token}" src="${script}"></script></body>
</html>`;
}

/** Prevents user-authored note text from ending an inline script element. */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
