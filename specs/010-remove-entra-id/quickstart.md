# Quickstart: Verifying Entra ID Removal

These steps validate that Entra ID support has been fully removed and that the
`none`/`github-pat` paths are unaffected.

## 1. No Entra ID identifiers remain

```sh
grep -rli "entra\|msal" --include="*.ts" --include="*.md" --include="*.json" . \
  | grep -v node_modules | grep -v "/dist/" \
  | grep -vE '^GOAL\.md$|^specs/(007-ai-support|008-cli-github-pat)/'
```

Expected: no output (GOAL.md's Feature 10 entry and the historical 007/008 spec
directories are excluded by design — see research.md).

## 2. No leftover dependency

```sh
grep -rn "msal" packages/*/package.json package.json
```

Expected: no output.

## 3. `none` and `github-pat` paths still work

```sh
npm test --workspaces --if-present
npm test
```

Expected: all existing `none`/`github-pat` test cases pass; Entra ID specific
test cases are gone (not skipped, removed).

## 4. CLI rejects `entra-id` as an ordinary invalid value

```sh
node dist/cli/index.js some-spec.yaml --auth-type entra-id
```

Expected: exits non-zero with the same "invalid auth type" message format used
for any other unrecognized value (e.g. `--auth-type bogus`), not a dedicated
"Entra ID is not supported" message.

## 5. MCP `set-ruleset-config` rejects `entra-id`

Call the tool with `{ "auth": { "type": "entra-id" } }`. Expected: standard
schema validation failure (unrecognized enum value), not `INVALID_AUTH_CONFIG`'s
tenant/client-id-specific message.

## 6. Documentation has no dangling references

Confirm `docs/mcp/entra-id-setup.md` no longer exists and no other doc page links
to it.
