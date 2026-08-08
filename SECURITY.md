# Security policy

## Local data

Dev Notes stores notes as Markdown files, by default inside the private VS Code storage of the extension. `devNotes.storagePath` can point them at any local folder. Nothing is sent to remote services.

Notes are plain text. Do not store passwords, tokens, private keys, or any material that should not remain readable on the device.

Rendered notes never execute embedded HTML or scripts, and only `http`, `https`, and `mailto` links are opened externally.

## Reporting a vulnerability

Do not open a public issue for a vulnerability or data exposure. When the repository has a configured private contact channel, use it and include reproduction steps and expected impact.
