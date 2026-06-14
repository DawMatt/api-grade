# Documentation Architecture for api-grade Project

## Overall Structure
Create a `/docs` directory with the following structure:

```
docs/
├── index.md                          # Main README (for GitHub)
├── getting-started.md                # High-level orientation
├── cli/
│   ├── README.md                     # CLI overview & installation
│   └── commands.md                   # Command reference & examples
├── package/
│   ├── README.md                     # api-grade-core overview & installation
│   ├── usage-guide.md                # Common patterns & examples
│   └── api-reference.md              # Detailed API docs
├── backstage-plugins/
│   ├── README.md                     # Plugins overview & architecture
│   ├── quick-start.md                # Fast-track setup guide
│   ├── plugin-setup.md               # Detailed setup for both plugins
│   ├── configuration.md              # Shared config & customization
│   └── troubleshooting.md            # Common issues & solutions
└── contributing.md                   # Development guide (if needed)
```

## Main README (`index.md` / root README.md)
**Keep this concise** — aim for ~200-500 words:
- Single paragraph: What is api-grade? (problem it solves)
- Example of grading output from the CLI
- Quick visual: ASCII diagram showing the three components
- Three bullet sections linking to:
  - **CLI Tool** — Quick install & example command
  - **Core Package** — What it does, one install/import example
  - **Backstage Plugins** — What they integrate, link to quick-start
- Quick links section: Links to full docs, contributing, license

## Component Documentation Structure

**CLI (`/docs/cli/README.md`)**
- Installation methods
- Quick start (one command showing it works)
- Link to full command reference

**Package (`/docs/package/README.md`)**
- What it exports
- Installation (npm/yarn)
- Minimal usage example
- Link to full API reference & usage guide

**Backstage Plugins (`/docs/backstage-plugins/README.md`)**
- Architecture overview (what the plugins do, how they interact)
- Prerequisites & requirements
- Link to quick-start for fastest path
- Link to plugin setup guide for detailed config

**Backstage Quick Start (`/docs/backstage-plugins/quick-start.md`)**
- Assumes Backstage app exists
- Step-by-step to get both plugins running
- Minimal configuration
- Common next steps

## Navigation Strategy
- Each document starts with breadcrumb or navigation header
- Document headers link to related docs
- Use relative links to maintain portability
- Index.md contains the main navigation hub

## Implementation Notes for Claude Code
- Create all `.md` files with consistent frontmatter (title, description)
- Use consistent heading hierarchy (h1 for title, h2 for major sections)
- Include "further reading" section at end of each doc linking to related pages
- Add version/last-updated info to plugin docs (they change with Backstage)
- Use clear link text like "→ Full CLI Documentation"

## Transition from initial documentation architecture

Migrate the existing root README.md content: extract CLI docs → docs/cli, extract package docs → docs/package, keep any Backstage content separate for docs/backstage-plugins. 

Shrink (aim: 300-400 words) the root README to a landing page with links to these three sections.
- Project name & one-sentence description
- Problem statement (what problem does api-grade solve?)
- Three-part visual showing CLI + Package + Plugins
- Quick links to the three component docs
- Links to: Contributing, License, Discussions/Issues