# Release Prompt

Use this prompt when preparing a release for `isomoes/opencode`. Pushing a
`v*` tag triggers `.github/workflows/release.yml`, which verifies the OCX
registry version and creates a GitHub Release whose body is extracted from
`CHANGELOG.md`. A successful release then triggers
`.github/workflows/registry.yml` to publish the registry to GitHub Pages.

## Prompt

```md
Prepare a release for `isomoes/opencode`.

Release target: `v<version>`
Release date: `<YYYY-MM-DD>`
GitHub username for changelog attribution: `@<username>`

Do the following in order:

1. Update `CHANGELOG.md`:
   - keep a fresh empty `## [Unreleased]` section at the top
   - rename the previous `## [Unreleased]` heading to `## [<version>] - <YYYY-MM-DD>`
   - keep each bullet ending with `(@<username>) <short-sha>`, matching the
     existing changelog format
   - the `## [<version>] - <YYYY-MM-DD>` block becomes the GitHub Release
     body, so trim it to release-worthy bullets

2. Bump the top-level `version` in `registry.jsonc` to `<version>`.
   The release workflow refuses to publish if it disagrees with the tag.

3. Build and validate the OCX registry:
   `./scripts/build-registry.sh`

4. Stage and commit the changes with a release-style message such as
   `release: v<version>`. Do NOT create the tag in the same commit.

5. Create an annotated tag pointing at the release commit:
   `git tag -a v<version> -m "Release v<version>"`

6. Push the commit and the tag together:
   `git push origin main v<version>`
   The tag push triggers `.github/workflows/release.yml`, which:
     - verifies `registry.jsonc` matches the tag version
     - extracts the matching `## [<version>]` block from `CHANGELOG.md`
     - creates a GitHub Release named `Release v<version>`
   After that succeeds, `.github/workflows/registry.yml` builds and deploys
   the OCX registry to GitHub Pages.

7. Verify on GitHub:
   - the `Release` workflow run is green
   - the `Publish OCX Registry` workflow run is green
   - the release appears under `Releases` with the expected notes
   - `https://isomoes.github.io/opencode/index.json` serves the new version

8. Report:
   - the version released
   - the release commit hash
   - the tag name
   - both workflow run URLs, the release URL, and the registry URL

If the version check fails, correct the release commit and create a new tag.
Do not force-push or replace a published release tag.
```

## Manual fallback

If the workflow is unavailable, create the release with:

```bash
gh release create v<version> \
  --title "Release v<version>" \
  --notes-file <(awk -v v="<version>" '
    $0 ~ "^## \\[" v "\\]" { p=1; next }
    p && /^## \[/ { exit }
    p { print }
  ' CHANGELOG.md)
```
