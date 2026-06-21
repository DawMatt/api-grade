# Repository Goal

## Purpose

Create a consistent way to grade API quality and share diagnostics to help with improving quality.

## Grading Approach

Use a grading approach that focuses on:

- Error-first prioritization — A single error blocks production more than 20 warnings
- Volume-aware severity — "38 warnings" triggers different language than "3 warnings"
- Category-specific insights — Mentions which area (oas, operations, schemas) needs the most work
- Actionable next steps — Doesn't just list problems, tells you where to start and why
- Tone-calibrated — "OK effort" vs "Critical" sets expectations before delivering details

The algorithm is NOT:

❌ Just counting violations
❌ Random rule selection
❌ Generic feedback templates
❌ One-size-fits-all commentary

It's a multi-stage pipeline where each stage feeds into the next, and each decision (tone → commentary → focus rules → recommendations) is data-driven.

## Features

Feature 1 - Base CLI

- Setup a CLI that grades API quality, and shares diagnostics about highest value areas to focus on improving
- Demonstrate the capability using OpenAPI and AsyncAPI specifications, including both low and high quality samples
- Allow for the CLI to be used in CI/CD pipelines. Support the ability for a minimum grade level to be defined, and trigger the pipeline to fail if that minimum grade level is not met
- Support both local and containerised execution of the CLI.
- Allow users to supply a custom spectral ruleset to use as the basis for assessing grades

Feature 3 - Package refactoring

- Extract the core API grading algorithm into a separate, dependency-light npm package
- CLI is updated to leverage the grading package
- API grading package is now available for use by feature 4

Feature 4 - Backstage API page

- Enable the same API quality grading and diagnostic information to be exposed on a Backstage API page. Default to showing this in the Info column below the About entry. 
- Allow users to supply a custom spectral ruleset to use as the basis for assessing grades. This may be located in a secured location such as a private GitHub Enterprise repository.
- Most users of backstage will only see the highest level of grade information - grade letter, percentage and label.
- By default, detailed API quality features (e.g. quality assessment, recommendations, and detailed diagnostic information) will be visible only to the API owner. Configuration will allow additional groups to be granted visibility as well, or visibility can be made allow all. 

Feature 5 - API grade documentation refactoring

- Refactor documentation for the repo, aligning with documentation_architecture.md

Feature 6 - npmjs

- Automate publishing packages to npmjs from the main branch. Use namespace dawmatt. e.g. core package would be named @dawmatt/api-grade-core
- Make sure any PRs against the main branch are of appropriate quality, and accepted by a maintainer, before they can be accepted and automatically published.
- Make sure the GitHub release description reflects the changes in the release. Gather this information from commit descriptions included in the release, ignoring any commit that only includes a release tag.
- Update documentation to cover npmjs. Includes both the user oriented documentation and the contribution guide

Feature 7 - Local AI support

- Allow API grading to be performed directly (locally) from LLMs and agentic AI tooling
- Support all of the standard functions of the api-grade CLI, including: grading an API (both overall and detailed levels), and asserting whether an API is at or above a particular grade (e.g. >= C)
- Use the api-grade's JSON format output so the AI is able to process and reformat the information in a way that suits its requirements
- Leverage the AI support to not just grade the API, but also resolve the "non-breaking change" issues highlighted by the grading that are bringing down the result
- Any local AI tooling support must explicitly include Claude Code and GitHub Copilot
- Add support for rulesets hosted on GitHub private repos (via PAT) and Entra ID protected environments (e.g. SharePoint, OneDrive)
- Support both direct installed and containerised execution of the functionality.

Feature 8 - CLI GitHub PAT

- Add CLI support for rulesets hosted on GitHub private repos (via PAT)

Feature 9 - JSON output refactor

- Align the JSON output format for the CLI with the grade-api-* tool outputs for the MCP server. If the backstage plugins also use similar JSON data formats, align those as well.
- All common concepts across JSON output formats should use the same structure, naming and values. The only differences should be where JSON data is specific to one of the tools producing the JSON (e.g. MCP's `recoveryOptions`).
- Refactor the packages so JSON output uses a common implementation in api-grade-core, and then tool packages enrich the output with any tool specific details (where required). This is expected to impact the core, MCP and CLI packages. It may also impact the backstage plugin packages.
- Add the "quick fixes only" capability from the MCP server to the CLI, via an additional command-line argument

Feature 10 - Remote AI support

- Allow API grading to be performed directly (remotely) from LLMs and agentic AI tooling
- Update AI support to include remote access via streamable/HTTP transport
- Any remote AI tooling support must explicitly include Claude Code, GitHub Copilot and Copilot Studio
- Support both direct installed and containerised execution of the functionality.

Feature 11 - Entra and CLI

- Confirm Entra ID ruleset functionality in MCP is operational, for Entra ID protected environments (e.g. SharePoint, OneDrive)
- Add Entra ID functionality to CLI as well

## Constitution

- API grading will use a similar algorithm and approach to the API grading and diagnostics capabilities found in OpenAPI Doctor: https://github.com/pb33f/doctor . This includes providing an overall grade (e.g. D) and numeric rating (e.g. 73%), a diagnostic summary identifying priority areas to focus on, followed by the diagnostic detail. The algorithm is summarised in api_diagnostic_algorithm_spec.md .
- All API grading and diagnostics functionality will support multiple API specification formats. This includes OpenAPI and AsyncAPI.
- All features will share a single, consistent implementation of the core grades and diagnostics functionality. The features will then use this core functionality in the way most appropriate for that feature.
- Users will be able to supply a custom spectral ruleset to use as the basis for grades and diagnostics. We require spectral ruleset compatibility, but spectral alternatives (e.g. [vacuum](https://github.com/daveshanley/vacuum)) should be considered.
- Maintain and use a test suite to ensure the specification has been delivered.
- Support current Windows and MacOS environments, at a minimum.
- Expect to deploy both containerised and local versions of functionality.
- Identify all pre-requisites necessary for the functionality to run correctly, and how to source them.
- The cost for all pre-requisites must be $0. Do not require any pre-requisites that have a cost associated with them. 
- Ultimately API grading is about teaching users good API development practices. To help reinforce this the project will use modern, well designed API examples such as Redocly's Museum API ( https://github.com/Redocly/museum-openapi-example ) or the Train Travel API ( https://github.com/bump-sh-examples/train-travel-api ).
- Every /speckit-implement must meet the quality threshold for publication to npmjs. If it doesn't meet the quality gate, it means /speckit-implement hasn't finished its work.