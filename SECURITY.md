# Security policy

## Local data

Dev Notes stores notes as Markdown files, by default inside the private VS Code storage of the extension. Legacy `devNotes.storagePath` data is copied into private storage once, leaving the source intact. Optional authorized Drive backups include notes and attachments.

Notes are plain text. Do not store passwords, tokens, private keys, or any material that should not remain readable on the device.

Rendered notes never execute embedded HTML or scripts, and only `http`, `https`, and `mailto` links are opened externally.

## Reporting a vulnerability

Do not open a public issue for a vulnerability or data exposure. When the repository has a configured private contact channel, use it and include reproduction steps and expected impact.

## Optional backups

Backups have no additional encryption by default and may contain readable notes, command environment variables, remembered inputs, paths and attachments. Google OAuth uses `drive.file`, PKCE and a local loopback callback. Tokens and Desktop OAuth credentials are stored in VS Code SecretStorage and excluded from snapshots. Optional passphrase encryption is portable: users must retain the passphrase outside the original computer. Import only trusted snapshots; unencrypted hashes detect accidental damage, not malicious modification. See [backup documentation](docs/BACKUPS.md).
