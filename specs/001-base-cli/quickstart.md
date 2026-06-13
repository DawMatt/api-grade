# Quickstart: api-grade CLI

**Branch**: `001-base-cli` | **Date**: 2026-06-12

---

## Prerequisites

| Prerequisite | Version | Cost | Where to get it |
|---|---|---|---|
| Node.js | 20 LTS or later | $0 | https://nodejs.org/en/download (installer) or https://github.com/nvm-sh/nvm (version manager) |
| npm | Bundled with Node.js | $0 | Included with Node.js install |
| Docker *(optional)* | 24+ | $0 | https://www.docker.com/products/docker-desktop |
| Git *(optional, to clone)* | Any | $0 | https://git-scm.com/downloads |

**Estimated setup time**: under 15 minutes from a fresh machine.

---

## Install the CLI

### Option A — Global npm install (recommended)

```bash
npm install -g api-grade
```

Verify the install:

```bash
api-grade --version
```

### Option B — Run without installing (npx)

```bash
npx api-grade <spec-file>
```

### Option C — Clone and build from source

```bash
git clone <repo-url>
cd api-grade
npm install
npm run build
npm link          # makes `api-grade` available globally
```

---

## Grade your first API

The repository includes sample specs for demonstration. After installing:

```bash
# Grade a high-quality OpenAPI spec (expect grade A or B)
api-grade tests/fixtures/openapi/museum-api.yaml

# Grade a low-quality OpenAPI spec (expect grade D or F)
api-grade tests/fixtures/openapi/poor-quality.yaml

# Grade an AsyncAPI spec
api-grade tests/fixtures/asyncapi/streetlights-api.yaml
```

Expected human-readable output:

```
Grade: A (92%) — Excellent

Quality Assessment:
Excellent. This specification is in excellent condition. No significant issues were detected.

Diagnostics (3 total — 0 errors, 3 warnings):

  warn   operation-tag-defined    paths » /museum » get   Line 14
         Operation tags must be defined in global tags.

  ...
```

---

## Use in a CI/CD pipeline

```bash
# Fail the pipeline if the API grades below B
api-grade openapi.yaml --min-grade B
```

```yaml
# GitHub Actions
- name: Check API quality
  run: api-grade ./api/openapi.yaml --min-grade B
```

Get machine-readable output for downstream steps:

```bash
api-grade openapi.yaml --format json > grade-report.json
```

---

## Use a custom Spectral ruleset

```bash
api-grade openapi.yaml --ruleset ./my-company-rules.yaml
```

The ruleset file must be a valid Spectral ruleset (YAML or JS). See the
[Spectral documentation](https://docs.stoplight.io/docs/spectral/e5b9616d6d50c-rulesets)
for the ruleset format.

---

## Limit diagnostic output

```bash
# Show only the top 10 highest-priority findings
api-grade openapi.yaml --top 10
```

---

## Use a project config file

Create `.apigrade.json` in your project root to set defaults without repeating flags:

```json
{
  "minGrade": "B",
  "ruleset": "./api-standards.yaml"
}
```

```bash
# Reads minGrade and ruleset from .apigrade.json automatically
api-grade openapi.yaml
```

CLI flags always override config file values:

```bash
# Overrides .apigrade.json minGrade with C for this run
api-grade openapi.yaml --min-grade C
```

---

## Run with Docker

Build the image locally from the repository root (requires Docker Desktop or Docker Engine):

```bash
# Build the image
docker build -t api-grade .

# Grade a spec file in the current directory (macOS/Linux)
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml

# With minimum grade gate
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml --min-grade B

# JSON output
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml --format json
```

**Windows (PowerShell)**:

```powershell
# Build the image
docker build -t api-grade .

# Grade a spec
docker run --rm -v "${PWD}:/work" api-grade /work/openapi.yaml

# With minimum grade gate
docker run --rm -v "${PWD}:/work" api-grade /work/openapi.yaml --min-grade B
```

### Verifying Container Output

To confirm the container produces identical output to the local CLI, run both against
the same fixture and compare:

```bash
# Local CLI output
node dist/cli/index.js tests/fixtures/openapi/museum-api.yaml > local-output.txt

# Container output (mount repo root so the fixture is accessible)
docker run --rm -v "$(pwd):/work" api-grade /work/tests/fixtures/openapi/museum-api.yaml > container-output.txt

# Compare — should produce no differences in grade, score, or diagnostics
diff local-output.txt container-output.txt
```

The only acceptable differences are ANSI colour codes (the container inherits the TTY
environment of the calling shell). To compare without colour codes:

```bash
node dist/cli/index.js tests/fixtures/openapi/museum-api.yaml --format json > local.json
docker run --rm -v "$(pwd):/work" api-grade /work/tests/fixtures/openapi/museum-api.yaml --format json > container.json
diff local.json container.json
```

---

## Windows Notes

`api-grade` runs natively on Windows 10/11 with Node.js 20 LTS. Known caveats:

**Path separators**: Use forward slashes (`/`) or double backslashes (`\\`) for file paths
on the command line. Single backslashes are treated as escape characters by most shells.

```cmd
:: cmd.exe — use forward slashes or double backslashes
api-grade path/to/openapi.yaml
api-grade path\\to\\openapi.yaml
```

```powershell
# PowerShell — forward slashes work natively
api-grade path/to/openapi.yaml
```

**Exit code propagation**: Both cmd.exe and PowerShell propagate exit codes correctly.
Use `echo %ERRORLEVEL%` (cmd.exe) or `echo $LASTEXITCODE` (PowerShell) to inspect them:

```powershell
api-grade openapi.yaml --min-grade B
echo $LASTEXITCODE   # 0 = pass, 1 = fail/error
```

**Line endings**: YAML spec files with Windows line endings (CRLF) are parsed correctly
by Spectral. No conversion is required.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `command not found: api-grade` | Run `npm install -g api-grade` or use `npx api-grade` |
| `Error: Could not detect API format` | Ensure the file is a valid OpenAPI (2/3) or AsyncAPI (2/3) YAML/JSON document |
| `Error: File not found` | Check the path is correct and the file exists |
| `Error: Ruleset file not found` | Verify the `--ruleset` path points to an existing file |
| Slow first run | npm may be downloading packages; subsequent runs are fast |
