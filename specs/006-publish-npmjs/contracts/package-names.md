# Package Name Registry: @dawmatt

**Feature**: 006-publish-npmjs | **Date**: 2026-06-16

This document is the single source of truth for all published package names under the `@dawmatt` scope. Any reference to a package name in documentation, workflows, or source code must match these names exactly.

## Registered Packages

### @dawmatt/api-grade-core

| Field | Value |
|-------|-------|
| Published name | `@dawmatt/api-grade-core` |
| Current name (pre-publish) | `api-grade-core` |
| Location | `packages/api-grade-core/` |
| Description | Core grading library — standalone, framework-agnostic |
| Audience | Developers integrating API grading into their own tooling |
| Peer dependencies | None |
| Install command | `npm install @dawmatt/api-grade-core` |

### @dawmatt/api-grade

| Field | Value |
|-------|-------|
| Published name | `@dawmatt/api-grade` |
| Current name (pre-publish) | `api-grade` |
| Location | `/` (repo root) |
| Description | CLI tool for grading API quality and sharing diagnostics |
| Audience | Developers and CI/CD pipelines running grade checks from the command line |
| Peer dependencies | None |
| Install command | `npm install -g @dawmatt/api-grade` |
| Binary name | `api-grade` |

### @dawmatt/backstage-plugin-api-grade

| Field | Value |
|-------|-------|
| Published name | `@dawmatt/backstage-plugin-api-grade` |
| Current name (pre-publish) | `backstage-plugin-api-grade` |
| Location | `packages/backstage-plugin-api-grade/` |
| Description | Backstage frontend (app) plugin — displays API quality grades on API entity pages |
| Audience | Backstage administrators adding the API grade card to their app |
| Peer dependencies | `@backstage/core-components`, `@backstage/core-plugin-api`, `@backstage/plugin-catalog-react`, `react` |
| Install command | `npm install @dawmatt/backstage-plugin-api-grade` |
| Required companion | `@dawmatt/backstage-plugin-api-grade-backend` |

### @dawmatt/backstage-plugin-api-grade-backend

| Field | Value |
|-------|-------|
| Published name | `@dawmatt/backstage-plugin-api-grade-backend` |
| Current name (pre-publish) | `backstage-plugin-api-grade-backend` |
| Location | `packages/backstage-plugin-api-grade-backend/` |
| Description | Backstage backend plugin — grades API entity specs and returns results via HTTP |
| Audience | Backstage administrators wiring up the backend service |
| Peer dependencies | `@backstage/backend-plugin-api`, `@backstage/catalog-client` |
| Install command | `npm install @dawmatt/backstage-plugin-api-grade-backend` |
| Required companion | `@dawmatt/backstage-plugin-api-grade` |

## Namespace

- **Scope**: `@dawmatt`
- **Registry**: `https://registry.npmjs.org`
- **Access**: Public (free)
- **Owner account**: `dawmatt` on npmjs.com

## Versioning Contract

All four packages are versioned together. At every release, all packages share the same version number. Semantic versioning (MAJOR.MINOR.PATCH) applies.

A MAJOR version increment is triggered when any of the following change in a backward-incompatible way:
- Exported function/type signatures in `@dawmatt/api-grade-core`
- CLI flag names or output schema in `@dawmatt/api-grade`
- Plugin component props or plugin API in `@dawmatt/backstage-plugin-api-grade`
- HTTP endpoint paths or response schemas in `@dawmatt/backstage-plugin-api-grade-backend`
