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
}

/**
 * HTML shell for both webviews. Markup and behavior live in the bundles built
 * from `src/presentation/webview`, so the host only wires assets and the CSP.
 */
export function webviewHtml({ webview, extensionUri, locale, bundle, title, allowImages = false }: ShellOptions): string {
  const token = nonce();
  const script = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', `${bundle}.js`));
  const style = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', `${bundle}.css`));
  const imageSources = allowImages ? `img-src ${webview.cspSource} https: data:; ` : '';

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${imageSources}style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${token}';" />
  <link rel="stylesheet" href="${style}" />
  <title>${title}</title>
</head>
<body><div id="root"></div><script nonce="${token}" src="${script}"></script></body>
</html>`;
}
