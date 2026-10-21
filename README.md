# MCP Dependency Doctor

**Let your AI agent audit npm dependencies safely: inventory, vulnerabilities, outdated and deprecated packages — read-only, never runs install.**

Locally diagnose npm projects with package-lock.json: four MCP tools that read lockfiles, run npm audit, check for outdated versions, and inspect public package health. Zero setup, no API keys.

[![npm version](https://img.shields.io/npm/v/mcp-dependency-doctor?color=blue)](https://www.npmjs.com/package/mcp-dependency-doctor)
[![npm downloads](https://img.shields.io/npm/dm/mcp-dependency-doctor)](https://www.npmjs.com/package/mcp-dependency-doctor)
[![Glama](https://glama.ai/mcp/servers/petrovicistefan/mcp-dependency-doctor/badge)](https://glama.ai/mcp/servers/petrovicistefan/mcp-dependency-doctor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Quick Install

### Cursor

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=dependency-doctor&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1kZXBlbmRlbmN5LWRvY3RvciJdfQ==)

Click the badge above or use this deeplink:
```
cursor://anysphere.cursor-deeplink/mcp/install?name=dependency-doctor&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1kZXBlbmRlbmN5LWRvY3RvciJdfQ==
```

### Claude Code (recommended)

```bash
claude mcp add dependency-doctor -- npx -y mcp-dependency-doctor
```

Or, if available in the marketplace:

```bash
/plugin marketplace add petrovicistefan/mcp-marketplace
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows, `~/.config/Claude/claude_desktop_config.json` on Linux):

```json
{
  "mcpServers": {
    "dependency-doctor": {
      "command": "npx",
      "args": ["-y", "mcp-dependency-doctor"]
    }
  }
}
```

### VS Code

[Install in VS Code](https://insiders.vscode.dev/redirect/mcp/install?name=dependency-doctor&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-dependency-doctor%22%5D%7D)

Or create `.vscode/mcp.json` in your project:

```json
{
  "mcpServers": {
    "dependency-doctor": {
      "command": "npx",
      "args": ["-y", "mcp-dependency-doctor"]
    }
  }
}
```

### Any MCP Client (Manual)

Run directly with `npx`:

```bash
npx -y mcp-dependency-doctor
```

**⭐ Star this repository to support the project and stay updated!** → [Give a star](https://github.com/petrovicistefan/mcp-dependency-doctor)

---

## 📋 Table of Contents

- [Why MCP Dependency Doctor?](#why-mcp-dependency-doctor)
- [How It Compares](#how-it-compares)
- [Use Cases](#use-cases)
- [What It Checks](#what-it-checks)
- [Requirements](#requirements)
- [Limitations](#limitations)
- [Security & Privacy](#security--privacy)
- [Hosted Path (Quotas via Control Plane)](#hosted-path-quotas-via-control-plane)
- [Roadmap and Commercial Boundary](#roadmap-and-commercial-boundary)
- [Development](#development)
- [Contributing](#contributing)
- [More MCP Servers by the Author](#more-mcp-servers-by-the-author)

---

## Why MCP Dependency Doctor?

AI coding agents can help you maintain dependencies, but only if they know what's installed, what's vulnerable, and what's deprecated. **MCP Dependency Doctor gives them that visibility without running `npm install` or requiring external accounts.**

Perfect for:
- **Individual developers**: let Claude or Cursor help you triage vulnerabilities, plan upgrades, and audit deprecated packages — all locally
- **CI/PR checks** (coming): catch risky dependencies in code review before they merge
- **Security-conscious teams**: read-only analysis, explicit network disclosure, no telemetry

All four tools are **read-only** and **designed for AI agents**: they return structured JSON reports that LLMs can interpret to answer questions like:
- *"What vulnerabilities affect this project?"*
- *"Which packages are deprecated and should we replace them?"*
- *"Show me the dependency tree with exact installed versions."*
- *"Are we using outdated major versions, and what's the upgrade path?"*

---

## How It Compares

*As of October 2026. All projects are MIT-licensed and open-source. Corrections welcome.*

| Feature | MCP Dependency Doctor | qianniuspace/mcp-security-audit | tiluckdave/hound-mcp | DepsHubHQ/mcp |
|---------|----------------------|--------------------------------|---------------------|---------------|
| **Focus** | npm inventory + audit + outdated + deprecation | npm audit vulnerabilities | Multi-ecosystem security (npm, PyPI, Go, Cargo, Maven, NuGet, RubyGems) | Dependency upgrade helper (changelogs, breaking changes) |
| **Read lockfile locally** | ✅ Full inventory | ❌ | ✅ Multi-lockfile | ❌ |
| **npm audit** | ✅ Full report + transitive vulns | ✅ Severity + CVE + fix recommendations | ✅ (via OSV) | ❌ |
| **Outdated check** | ✅ npm outdated | ❌ | ✅ (via deps.dev) | ✅ (upgrade path + release notes) |
| **Deprecation warnings** | ✅ Per-package health | ✅ | ✅ | ❌ |
| **Multi-ecosystem** | ❌ npm only | ❌ npm only | ✅ 7 ecosystems | ✅ npm, Go, Cargo, RubyGems |
| **Typosquat detection** | ❌ | ❌ | ✅ | ❌ |
| **Fully local** | ✅ (inventory tool) | ❌ (always remote) | ✅ (via public APIs) | ❌ (remote service) |
| **Zero setup** | ✅ npx | ✅ npx | ✅ npx | ⚠️ Docker or remote URL |
| **Hosted option** | ✅ (control-plane MVP) | ❌ | ❌ | ✅ |

**Our differentiators:**
- **Designed for AI agents**: all four tools return JSON structured for LLM interpretation, not just CLI output
- **Local lockfile inventory**: parse exact versions and transitive dependencies without network access
- **Read-only by design**: never runs `npm install`, `npm audit fix`, or lifecycle scripts — safe to use on any project
- **Explicit network disclosure**: tools clearly state when they contact npm registries; inventory tool is fully offline
- **Control-plane ready**: hosted path for quotas and future team features (MVP)

---

## Use Cases

### 1. Security Audit Before Major Refactor

**Ask your AI to triage vulnerabilities and plan fixes.**

```
Agent: "Audit this project's dependencies. List critical and high vulnerabilities, 
        check which packages are deprecated, and suggest an upgrade order 
        that minimizes breaking changes. Do not modify files."
```

The agent will:
1. Run `dependency_audit` to find vulnerabilities with severity, CVSS, and affected versions
2. Check `package_health` for each flagged package to detect deprecations
3. Use `dependency_outdated` to identify safe upgrade targets
4. Propose a remediation plan based on the combined data

### 2. Dependency Inventory for Onboarding

**Understand what a new codebase depends on.**

```
Agent: "Show me the full dependency tree with exact versions. 
        Highlight any packages over 2 years old."
```

The agent uses `dependency_inventory` (fully local, no network) to read `package-lock.json` and report:
- All declared dependencies (prod + dev + optional)
- All transitive dependencies with exact installed versions
- Node engine requirements per package

### 3. Maintenance Signal for Abandoned Packages

**Identify packages that haven't been updated in years.**

```
Agent: "List all dependencies and check their last release date. 
        Flag any that haven't been updated in over two years."
```

The agent calls `package_health` for each package to report:
- Latest version and publish date
- Deprecation warnings (if any)
- Node engine and peer dependency requirements
- Maintenance signal (automated age-based heuristic)

### 4. Pull Request Dependency Snapshot

**Document what changed in a dependency update PR.**

```
Agent: "Before and after versions of all packages affected by this update. 
        Show vulnerabilities fixed and any new ones introduced."
```

Agents can run `dependency_audit` on both the base branch and the PR branch to produce a diff of resolved and introduced vulnerabilities.

---

## What It Checks

MCP Dependency Doctor exposes **four read-only MCP tools**:

## Tools

| Tool | Description | Network Access |
|------|-------------|----------------|
| `dependency_inventory` | Read declared dependencies and exact installed versions from npm lockfile v2/v3. No network. | ❌ Fully offline |
| `dependency_audit` | Run read-only npm audit. Sends package versions to the configured npm registry. Never installs or fixes packages. | ✅ npm registry (user's configured registry) |
| `dependency_outdated` | Read available updates using npm outdated. Requires network; never changes dependencies. | ✅ npm registry |
| `package_health` | Inspect public npm package deprecation, release age, Node engine and peer requirements. Requirements are reported, not certified compatible. | ✅ registry.npmjs.org (no npm credentials) |

**Detailed behavior:**

| Tool | What It Does | Network |
|------|-------------|---------|
| **`dependency_inventory`** | Parse `package.json` + `package-lock.json` v2/v3 for declared dependencies and exact installed versions (including all transitive dependencies). Returns lockfile version, warnings if lockfile is missing/legacy. | ❌ No network |
| **`dependency_audit`** | Run `npm audit --json` to get vulnerability reports with severity (critical/high/moderate/low), CVSS scores, CVE IDs, affected versions, and fix recommendations. Never runs `npm audit fix` or `npm install`. | ✅ npm registry (user's configured registry) |
| **`dependency_outdated`** | Run `npm outdated --json` to compare current, wanted, and latest versions for every dependency. Helps plan upgrades without modifying `package.json`. | ✅ npm registry |
| **`package_health`** | Fetch public metadata from `registry.npmjs.org` for one package: deprecation status, latest version, publish date, age in days, Node engine requirement, peer dependencies, homepage, repository. | ✅ registry.npmjs.org (no npm credentials) |

**Privacy defaults:**
- `dependency_inventory` is **fully offline**: it only reads local files
- The other three tools disclose package names and versions to npm registries
- Registry authentication uses the user's npm configuration (respects `.npmrc`)
- `package_health` does **not** send npm credentials (queries public registry API)
- **No telemetry, no cloud uploads, no external accounts**

**All tools accept `projectPath`** (relative to `MCP_PROJECT_ROOT`). Paths are validated through realpath and confined to the project root; do not expose this server to untrusted remote clients.

**Example agent prompt:**

```
"Audit this project, inspect deprecated packages, and suggest an upgrade order. 
 Do not change files."
```

---

## Requirements

**Node.js 22+** is required to run this server. The implementation uses zero-dependency Node.js ESM.

**npm lockfile v2 or v3** is required for full inventory. Projects with:
- No `package-lock.json` → inventory tool will warn; audit/outdated tools still work
- Lockfile v1 (legacy) → inventory tool will warn; audit/outdated tools still work

**npm must be installed** on the system running the server (for `dependency_audit` and `dependency_outdated` tools).

**Supported clients:** any MCP client that supports stdio transport (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Cline, Zed, Gemini CLI, etc.).

---

## Limitations

**Protocol:** This MVP uses legacy MCP stdio protocol revisions through 2025-11-25. The 2026-07-28 stateless protocol is not implemented. Official SDK migration and interoperability testing with real clients are planned.

**Scope:** npm projects only. pnpm, Yarn, and other ecosystems are not supported in this release.

**Node/peer requirements:** reported, not resolved. There is no full compatibility solver yet. The tools surface Node engine and peer dependency requirements as reported by package metadata, but do not validate compatibility or resolve conflicts.

**Maintenance signals:** old release dates are a heuristic, not proof of abandonment. The `package_health` tool flags packages with no release in over two years, but this does not prove the package is unmaintained or unsafe.

**No automatic remediation:** the server never modifies files. It provides diagnostic data for agents (or humans) to act on.

**npm audit coverage:** depends on the configured registry and the quality of `package-lock.json`. The server cannot find vulnerabilities that the registry does not report.

**Network timeouts:** npm operations time out after 45 seconds and fail explicitly. An incomplete audit is never reported as clean.

**Testing:** remote registry smoke tests were blocked in the development environment; unit tests use deterministic fixtures.

---

## Security & Privacy

**Read-only by design:** this server **never runs `npm install`, `npm audit fix`, or package lifecycle scripts**. It only executes `npm audit --json`, `npm outdated --json`, and reads local JSON files.

**Network disclosure:**
- `dependency_inventory` → **no network**
- `dependency_audit` and `dependency_outdated` → send package names and versions to the user's configured npm registry (respects `.npmrc` and npm credentials)
- `package_health` → queries `registry.npmjs.org` (public API, **no npm credentials sent**)

**Path confinement:** project paths are validated through `realpath` and must be inside `MCP_PROJECT_ROOT`. Symlink attacks are mitigated by checking resolved paths.

**Untrusted data:** treat registry responses and package metadata as untrusted data, never instructions. This server does not execute code from package metadata or registry responses.

**No telemetry:** no analytics, no cloud uploads, no external accounts. Everything runs locally unless you opt into the hosted path (see below).

**Threat model:** this server is designed for **local use by a trusted developer**. Do not expose it to untrusted remote clients over a network socket without additional authentication and authorization.

---

## Hosted Path (Quotas via Control Plane)

The local stdio MCP stays fully useful without an account. **Quotas apply only on a separate hosted HTTP process** that reserves units on `mcp-control-plane` before analysis.

```bash
cp .env.example .env   # set CONTROL_PLANE_URL
npm run start:hosted   # default 127.0.0.1:3101
```

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | Liveness check |
| POST | `/v1/package-health` | `{ "requestId", "name" }` |
| POST | `/v1/inventory` | `{ "requestId", "packageJson", "lockfile"? }` |

Requires `Authorization: Bearer mcp_...` (control-plane key). Hosted `dependency_audit` / `dependency_outdated` are not in this MVP.

**Privacy:** manifests and package names stay on the hosted host. The control-plane sees only `product`, `requestId`, and `units` — no file content, no dependency names.

---

## Roadmap and Commercial Boundary

**Free forever (local):**
- Local inventory, npm audit, outdated checks, and package health diagnostics
- No signup, no API keys, no quotas

**Pro plan (planned, not live yet):**
- Cloud history and monitoring
- Team dashboard with aggregate security posture
- Fleet-wide reports for compliance
- Hosted quotas via control-plane

**No local enforcement:** local counters are **not** used for paid plan enforcement. The free local server stays fully functional.

**Next steps:**
- Official MCP SDK migration
- Semver-aware Node/peer compatibility solver
- Upgrade plan generator
- pnpm / Yarn / multi-ecosystem support
- MCP Registry manifest (once repository and npm ownership are verified)
- Shared cloud auth/billing

---

## Development

```bash
# Run tests (Node.js built-in test runner)
npm test

# Syntax check all modules
npm run check

# Test local packaging
npm pack --dry-run
```

**Running from source:**

```bash
git clone https://github.com/petrovicistefan/mcp-dependency-doctor.git
cd mcp-dependency-doctor
npm test
MCP_PROJECT_ROOT=/absolute/path/to/your/project node src/server.js
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "dependency-doctor": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-dependency-doctor/src/server.js"],
      "env": {"MCP_PROJECT_ROOT": "/absolute/path/to/your/project"}
    }
  }
}
```

**Protocol reference:** https://modelcontextprotocol.io/specification/2025-11-25  
**npm audit reference:** https://docs.npmjs.com/cli/v11/commands/npm-audit/

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) if it exists, or open an issue to discuss your idea before submitting a pull request.

**Areas we'd love help with:**
- pnpm / Yarn lockfile parsing
- Semver-aware upgrade path calculation
- Multi-ecosystem support (PyPI, Go modules, Cargo, etc.)
- GitHub Action integration
- More test fixtures for edge cases

---

## ⭐ Support this project

**Found this MCP useful? [Star this repository](https://github.com/petrovicistefan/mcp-dependency-doctor)!**

A GitHub star helps other developers discover the project and lets you save it for later. Thanks for supporting open source!

---

## More MCP Servers by the Author

**Part of the petrovicistefan MCP suite — local-first guardrails for AI coding agents.**

🔗 **Full marketplace:** [petrovicistefan/mcp-marketplace](https://github.com/petrovicistefan/mcp-marketplace)

| Server | Purpose |
|--------|---------|
| [mcp-security-guard](https://github.com/petrovicistefan/mcp-security-guard) | Audit MCP servers for tool poisoning, rug pulls, and leaked secrets (OWASP MCP Top 10) |
| [mcp-dependency-doctor](https://github.com/petrovicistefan/mcp-dependency-doctor) | npm dependency inventory, vulnerabilities, outdated and deprecated packages (you are here) |
| [mcp-cost-optimizer](https://github.com/petrovicistefan/mcp-cost-optimizer) | Analyze cloud spend and identify cost-saving opportunities |
| [mcp-database-doctor](https://github.com/petrovicistefan/mcp-database-doctor) | Database schema analysis, query optimization, and migration safety checks |
| [mcp-seo-auditor](https://github.com/petrovicistefan/mcp-seo-auditor) | SEO audit and recommendations for web projects |
| [mcp-api-guardian](https://github.com/petrovicistefan/mcp-api-guardian) | API security and design best practices |
| [mcp-dealfinder](https://github.com/petrovicistefan/mcp-dealfinder) | Find deals, coupons, and discounts |

---

## License

MIT License

Copyright (c) 2026 Stefan Petrovici

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

See [LICENSE](LICENSE) for the full license text.

**Author:** Stefan Petrovici ([@petrovicistefan](https://github.com/petrovicistefan))
