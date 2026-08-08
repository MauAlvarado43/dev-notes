# Publishing a release

## Version scope

- `0.x.Y`: compatible fixes, documentation, refactors, and small improvements.
- `0.X.0`: visible functionality or meaningful workflow changes.
- `1.0.0`: the first stable public experience.

While Dev Notes remains on `0.x`, every meaningful behavior change must be explicit in the release notes.

## Checklist

1. Create a `feature/<topic>` branch from `develop`.
2. Open a pull request from the feature branch into `develop`; CI validates the change.
3. Move the `Unreleased` entries in `CHANGELOG.md` into a new version section.
4. Update `version` in `package.json` and confirm Settings displays the same value.
5. Open a pull request from `develop` into `main` and merge it.
6. The `Validate and release` workflow validates the project, packages `dist/dev-notes-{version}.vsix`, creates or updates the `v{version}` GitHub release, and uses the matching changelog section as its notes.

The release workflow requires a matching `## [{version}]` section in `CHANGELOG.md`. It fails before publication when the version or release notes are missing.

## Release notes template

```md
## Dev Notes {version}

### Added
-

### Changed
-

### Fixed
-

### Validation
- `npm run check`
```

## Marketplace preparation

Before publishing to Visual Studio Marketplace, confirm the publisher and add the public repository, issue URL, homepage, and icon metadata in `package.json`.
