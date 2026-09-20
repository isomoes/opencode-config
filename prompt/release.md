# Release Prompt

Use this prompt when preparing a release for `isomoes/opencode-config`. Pushing a
`v*` tag triggers `.github/workflows/release.yml`, which creates a GitHub Release
whose body is extracted from `CHANGELOG.md`.

## Prompt

```md
Prepare a release for `isomoes/opencode-config`.

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

2. Validate the configuration and check the diff for accidental changes.

3. Stage and commit the changes with a release-style message such as
   `release: v<version>`. Do NOT create the tag in the same commit.

4. Create an annotated tag pointing at the release commit:
   `git tag -a v<version> -m "Release v<version>"`

5. Push the commit and the tag together:
   `git push origin main v<version>`
   The tag push triggers `.github/workflows/release.yml`, which:
     - extracts the matching `## [<version>]` block from `CHANGELOG.md`
     - creates a GitHub Release named `Release v<version>`

6. Verify on GitHub:
   - the `Release` workflow run is green
   - the release appears under `Releases` with the expected notes

7. Report:
   - the version released
   - the release commit hash
   - the tag name
   - the workflow run URL and the release URL

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
