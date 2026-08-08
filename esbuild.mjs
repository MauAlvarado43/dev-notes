import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const shared = { bundle: true, sourcemap: true, minify: !watch, logLevel: 'info' };
const webview = {
  ...shared,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  loader: { '.css': 'css' }
};

const builds = [
  {
    ...shared,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node20'
  },
  {
    ...webview,
    entryPoints: ['src/presentation/webview/sidebar/main.ts'],
    outfile: 'dist/sidebar.js'
  },
  {
    ...webview,
    entryPoints: ['src/presentation/webview/editor/main.ts'],
    outfile: 'dist/editor.js'
  },
  {
    ...webview,
    entryPoints: ['src/presentation/webview/board/main.ts'],
    outfile: 'dist/board.js'
  }
];

if (watch) {
  const contexts = await Promise.all(builds.map((build) => esbuild.context(build)));
  await Promise.all(contexts.map((context) => context.watch()));
  console.log('Dev Notes is watching for changes...');
} else {
  await Promise.all(builds.map((build) => esbuild.build(build)));
}
