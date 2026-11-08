# Contributing

## Check a change

`scripts/check-package.sh [commit]` installs a commit into a scratch Pi
directory with `pi install git:...`. It checks that every bundled tool
registers, that no extension fails to load, and that the shared rules reach the
model request once. It does not read or change your own Pi configuration.

Run it after any change to `package.json` or `extensions/`.

## Change a bundled package version

1. Edit `dependencies` in `package.json`.
2. Confirm that the package entry file still matches its path in
   `pi.extensions`.
3. Run `scripts/check-package.sh`.

## Release

`scripts/release.sh vX.Y.Z` sets the version, writes the new tag into the
install commands in `README.md` and `docs/install.md`, regenerates
`CHANGELOG.md`, runs the package check, commits, signs the tag, and publishes
the release.

## Reference

- [Diagram output contract](docs/workflows/diagram-output-contract.md)
