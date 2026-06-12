# Feature Specification: Base CLI for API Quality Grading

**Feature Branch**: `001-base-cli`

**Created**: 2026-06-12

**Status**: Draft

## Clarifications

### Session 2026-06-12

- Q: What grade scale should the CLI use for output? → A: Both letter grade (A–F, emphasised) and numeric score (0–100) displayed in all output modes.
- Q: How should diagnostics be ordered in the output? → A: Mirror OpenAPI Doctor's ordering approach.
- Q: Should the CLI accept URLs as input in addition to local file paths? → A: Local file paths only for this feature; a `--url` flag is reserved (documented, not implemented) for future use.
- Q: How much diagnostic detail should the default output show? → A: All diagnostics shown by default; a `--top N` flag allows users to limit output to the N highest-priority findings.
- Q: What format does `--min-grade` accept? → A: Letter grade only (e.g., `--min-grade B`).

**Input**: User description: "Setup a CLI that grades API quality, and shares diagnostics
about highest value areas to focus on improving. Demonstrate the capability using OpenAPI
and AsyncAPI specifications, including both low and high quality samples. Allow for the
CLI to be used in CI/CD pipelines. Support the ability for a minimum grade level to be
defined, and trigger the pipeline to fail if that minimum grade level is not met. Support
both local and containerised execution of the CLI. Allow users to supply a custom spectral
ruleset to use as the basis for assessing grades."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Grade an API spec from the command line (Priority: P1)

A developer runs the CLI against a local OpenAPI or AsyncAPI specification file and
receives a quality grade (e.g., A–F or 0–100) along with a prioritised list of
diagnostics showing which issues have the highest impact on the grade. The developer
understands at a glance what to fix first.

**Why this priority**: This is the core value proposition of the entire tool. Without
a working grade + diagnostics output, no other story has value.

**Independent Test**: Can be fully tested by running the CLI against one of the bundled
sample API specs and verifying that a grade and at least one diagnostic are printed to
stdout.

**Acceptance Scenarios**:

1. **Given** a valid OpenAPI specification file on disk,
   **When** the user runs the CLI with that file as input,
   **Then** the output contains: (a) an overall grade displaying the letter, numeric
   percentage, and a grade label (e.g., `D (73%) — Below Standard`); (b) a
   professional-tone diagnostic summary identifying the highest-impact violation
   categories to address; (c) the full ordered list of individual diagnostics;
   and the process exits with code 0.

2. **Given** a valid AsyncAPI specification file on disk,
   **When** the user runs the CLI with that file as input,
   **Then** the same grade + diagnostics output is produced as for OpenAPI — the format
   is consistent across both spec types.

3. **Given** a path to a file that does not exist,
   **When** the user runs the CLI with that path,
   **Then** a clear error message is printed to stderr and the process exits with a
   non-zero exit code.

4. **Given** a file that is neither a valid OpenAPI nor AsyncAPI specification,
   **When** the user runs the CLI with that file,
   **Then** a helpful error message indicating the unsupported or invalid format is
   printed to stderr and the process exits with a non-zero exit code.

---

### User Story 2 - Enforce a minimum grade in a CI/CD pipeline (Priority: P2)

A DevOps engineer configures the CLI in a CI/CD pipeline with a minimum acceptable
grade level. When an API spec is committed that falls below that threshold, the pipeline
step fails automatically, preventing the change from being merged.

**Why this priority**: CI/CD integration multiplies the tool's reach and is explicitly
required. It depends on US1 (grading) being functional but adds no new grading logic.

**Independent Test**: Can be tested by running the CLI against a known low-quality
sample spec with a minimum grade set higher than the expected result, and confirming
the process exits with a non-zero exit code. Conversely, running against a high-quality
sample with the same threshold should exit 0.

**Acceptance Scenarios**:

1. **Given** a minimum grade level is configured (via CLI flag or config file),
   **When** the graded API meets or exceeds that minimum,
   **Then** the process exits with code 0 so the pipeline step passes.

2. **Given** a minimum grade level is configured (e.g., `--min-grade B`),
   **When** the graded API falls below that minimum,
   **Then** the process exits with a non-zero exit code and prints a clear message
   identifying the letter grade achieved vs. the minimum required.

3. **Given** no minimum grade level is configured,
   **When** the CLI runs,
   **Then** the process always exits with code 0 (grading output only, no gate).

---

### User Story 3 - Use a custom Spectral ruleset for grading (Priority: P3)

A platform team member supplies their organisation's own Spectral ruleset file as
the grading basis, so that grades and diagnostics reflect the organisation's specific
API standards rather than the built-in defaults.

**Why this priority**: Customisability is a key differentiator but relies on US1's
grading pipeline being in place. It can be delivered independently as an add-on to
the core grading flow.

**Independent Test**: Can be tested by supplying a minimal custom Spectral ruleset
that flags a specific known pattern, then running the CLI against a spec that triggers
that pattern, and confirming the diagnostic appears in the output.

**Acceptance Scenarios**:

1. **Given** a path to a valid custom Spectral ruleset file,
   **When** the user runs the CLI with that ruleset specified,
   **Then** grading and diagnostics are based solely on the custom ruleset rules,
   not the built-in defaults.

2. **Given** a custom ruleset path is specified but the file does not exist,
   **When** the user runs the CLI,
   **Then** a clear error message is printed to stderr and the process exits non-zero.

3. **Given** no custom ruleset is specified,
   **When** the user runs the CLI,
   **Then** the built-in default ruleset is used automatically.

---

### User Story 4 - Run the CLI in a container (Priority: P4)

A developer who prefers not to install the tool's prerequisites locally runs the CLI
using a pre-built container image, achieving identical output to a local installation.

**Why this priority**: Container support broadens accessibility but is a packaging
concern that does not affect core grading logic. It can be validated independently
once the core CLI works.

**Independent Test**: Can be tested by running the container image with a mounted
spec file and confirming the grade + diagnostics output matches the equivalent local
run.

**Acceptance Scenarios**:

1. **Given** the container image is available locally,
   **When** the user runs it with a spec file mounted as a volume,
   **Then** the CLI produces the same grade and diagnostics as the local installation
   for the same input file.

2. **Given** the container image is available,
   **When** the user passes a minimum grade flag,
   **Then** the container exits with the same exit code as the local CLI would for
   the same inputs.

---

### Edge Cases

- What happens when the spec file is syntactically valid JSON/YAML but semantically
  empty (no paths, no channels)?
- How does the tool handle very large spec files (e.g., 10 MB+)?
- What if the Spectral ruleset references external URLs that are unreachable at
  grading time?
- What if the same spec file triggers conflicting rules from the custom ruleset?
- What does the diagnostic summary look like when the spec has no violations (perfect score)?
- How should the diagnostic summary behave when there are only hints and no errors or warnings?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST accept a local file path to an OpenAPI specification
  as input and produce a quality grade and a diagnostic list ordered using the
  same prioritisation approach as OpenAPI Doctor.
- **FR-002**: The CLI MUST accept a local file path to an AsyncAPI specification
  as input and produce the same quality grade and diagnostic output as for OpenAPI.
- **FR-003**: The CLI MUST support a `--min-grade <LETTER>` option (or equivalent
  config file key) accepting a letter grade (A–F) that causes the process to exit
  non-zero when the achieved grade is below the specified threshold.
- **FR-004**: The CLI MUST support a `--ruleset` option that accepts a path to a
  Spectral-compatible ruleset file to use in place of the built-in default.
- **FR-005**: When no custom ruleset is supplied, the CLI MUST grade using a
  built-in default Spectral-compatible ruleset.
- **FR-006**: The CLI MUST produce human-readable output to stdout by default,
  structured in three parts:
  1. **Overall grade line**: letter grade (A–F, prominently), numeric score as a
     percentage (e.g., 73%), and a grade label (Excellent / Good / OK /
     Below Standard / Poor) — e.g., `Grade: D (73%) — Below Standard`.
  2. **Diagnostic summary**: a concise professional-tone paragraph identifying the
     count of errors and warnings, their impact on quality, and the top rule IDs
     accounting for the most violations. The tone MUST be clear and factual (not
     colloquial). When there are no violations the summary MUST state that the
     specification is in excellent condition.
  3. **Diagnostic detail**: the full ordered list of individual findings.
  The grade MUST be the most visually prominent element. All diagnostics MUST
  be shown by default; a `--top N` flag MUST allow users to limit the detail
  section to the N highest-priority findings (the summary always reflects the
  full count).
- **FR-007**: The CLI MUST support a machine-readable output format (JSON) via a
  flag (e.g., `--format json`), suitable for CI/CD pipeline consumption. JSON output
  MUST include the letter grade, numeric score, grade label, diagnostic summary
  text, and the full diagnostics array.
- **FR-014**: The linting engine used for grading MUST be compatible with Spectral
  ruleset files so that custom rulesets supplied via `--ruleset` work without
  modification. Alternative Spectral-compatible engines (such as vacuum,
  https://github.com/daveshanley/vacuum) SHOULD be evaluated during implementation
  for performance or compatibility advantages over the reference Spectral engine.
- **FR-008**: All error conditions MUST print a descriptive message to stderr and
  exit with a non-zero exit code.
- **FR-009**: The repository MUST include at least one low-quality and one
  high-quality sample OpenAPI specification and at least one of each for AsyncAPI,
  for demonstration and testing purposes.
- **FR-010**: The CLI MUST run on current Windows and macOS environments without
  modification.
- **FR-011**: A documented container image (Dockerfile) MUST be provided that
  produces a working CLI image using only $0-cost base images.
- **FR-012**: All prerequisites required to run the CLI locally MUST be documented
  with instructions for how to obtain them, and every prerequisite MUST be
  available at $0 cost.
- **FR-013**: The CLI MUST document a `--url` flag as reserved for future use.
  The flag MUST NOT be implemented in this feature; if supplied, the CLI MUST
  print a "not yet supported" message and exit non-zero.

### Key Entities

- **API Specification**: A file conforming to OpenAPI or AsyncAPI standards,
  provided as input for grading. Key attributes: file path, detected format,
  version.
- **Grade**: A quality score derived from applying a ruleset to an API specification.
  Comprises three components: letter grade (A–F), numeric score (0–100 as a
  percentage), and a grade label conveying the qualitative meaning of the score
  (Excellent / Good / OK / Below Standard / Poor).
- **Grade Label**: A short qualitative descriptor paired with a letter grade:
  A = Excellent, B = Good, C = OK, D = Below Standard, F = Poor.
- **Diagnostic Summary**: A concise professional-tone paragraph produced alongside
  the grade. It states the total error and warning counts, their impact on quality,
  and the top rule IDs to focus on — following the same logic as OpenAPI Doctor
  but using clear, factual language.
- **Diagnostic**: A single finding produced during grading. Key attributes: rule
  name, severity, location in spec, human-readable message, impact on grade.
  Diagnostics MUST be ordered using the same prioritisation approach as OpenAPI
  Doctor (https://github.com/pb33f/doctor).
- **Linting Engine**: The engine used to apply ruleset rules to an API specification
  and produce diagnostics. MUST be compatible with Spectral ruleset files. The
  reference engine is Spectral (@stoplight/spectral-core); vacuum
  (https://github.com/daveshanley/vacuum) is a Spectral-compatible alternative
  to be evaluated during implementation.
- **Spectral-Compatible Ruleset**: A file defining the rules used to evaluate an API
  specification, conforming to the Spectral ruleset format. May be the built-in
  default or a user-supplied custom file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can grade a local OpenAPI or AsyncAPI spec file and see
  an overall grade (letter, percentage, label), a diagnostic summary, and the
  full diagnostic list within 30 seconds of invoking the CLI.
- **SC-002**: The CLI correctly identifies and grades both the bundled low-quality
  and high-quality sample specs, with the high-quality sample receiving a
  meaningfully higher grade than the low-quality sample.
- **SC-003**: A CI/CD pipeline step using `--min-grade` fails for the bundled
  low-quality sample and passes for the bundled high-quality sample, with no
  manual intervention required.
- **SC-004**: A developer can substitute the built-in ruleset with a custom
  Spectral ruleset file and observe different diagnostic output reflecting the
  custom rules.
- **SC-005**: The containerised CLI produces output identical to the local CLI
  for the same input file and flags.
- **SC-006**: All prerequisites are documented and can be obtained at $0 cost;
  the quickstart guide can be followed by a new contributor to a working CLI
  in under 15 minutes.

## Assumptions

- The grading algorithm will be based on ruleset violations weighted by severity
  (error, warn, info, hint); the exact weighting formula will be determined
  during implementation by studying OpenAPI Doctor's approach.
- All output modes display the letter grade (A–F, primary), numeric score as a
  percentage (0–100%), and a grade label. Grade labels: A = Excellent, B = Good,
  C = OK, D = Below Standard, F = Poor. Boundary thresholds to be confirmed
  against OpenAPI Doctor's implementation during development.
- The diagnostic summary uses a professional, factual tone. It will NOT use
  colloquial or informal language. The summary logic (error/warning counts,
  top rule identification) mirrors OpenAPI Doctor; the wording does not.
- vacuum (https://github.com/daveshanley/vacuum) is a Spectral-compatible linting
  engine that will be evaluated during implementation as a potential alternative
  to the reference Spectral engine. The evaluation criteria are: Spectral ruleset
  compatibility, performance, and active maintenance status.
- The CLI will be implemented as a single executable invoked via command line;
  no GUI or web server component is in scope for this feature.
- The CLI accepts only local file paths as input in this feature. URL-based input
  is out of scope; a `--url` flag is reserved and documented but not implemented.
- The container image will use a publicly available, free base image (e.g.,
  Alpine Linux or a Node.js official image).
- Sample API specs (Museum API, Train Travel API) are assumed to be usable under
  their existing open-source licences for demonstration and test purposes.
- Windows support means the CLI runs natively on Windows (cmd/PowerShell) or via
  WSL; the container image covers the case where native Windows execution is
  impractical.
- The custom Spectral ruleset must be a local file path for this feature; fetching
  rulesets from remote URLs or secured repositories is out of scope (that is a
  Feature 2 concern).
