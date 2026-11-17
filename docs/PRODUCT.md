# MCP Dependency Doctor: product facts

Sources: `README.md`, `package.json`, `server.json`, `src/`. Update this file when those change.

## What it is

A read-only npm dependency diagnostics MCP server for AI coding agents. It reports declared and installed dependencies, `npm audit` and `npm outdated` results, and public registry health for a package. Package `mcp-dependency-doctor`, MCP name `io.github.petrovicistefan/mcp-dependency-doctor`, stdio transport, MIT licensed.

## What it is NOT

- Not a fixer: it never runs `npm install`, `npm audit fix` or package lifecycle scripts, and never modifies files.
- Not a compatibility solver: Node engine and peer requirements are reported, not resolved.
- Not multi-ecosystem: npm only (no pnpm or Yarn).
- Not a proof of abandonment or safety: age-based maintenance signals are heuristics, and audit coverage depends on the configured registry.
- Not built for untrusted remote clients: it is designed for local use by a trusted developer.

## Users

AI coding agents and developers (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Cline, Zed, Gemini CLI and other stdio MCP clients) who want to triage vulnerabilities, deprecated or outdated packages and exact installed versions.

## Tools (all read-only)

| Tool | What it does | Network |
|------|--------------|---------|
| `dependency_inventory` | Reads `package.json` and `package-lock.json` (v2/v3) for declared and exact installed versions, including transitive ones; warns on a missing or legacy lockfile | None |
| `dependency_audit` | Runs `npm audit --json`; reports vulnerabilities | User's configured npm registry |
| `dependency_outdated` | Runs `npm outdated --json`; compares current, wanted and latest | User's configured npm registry |
| `package_health` | Public metadata from `registry.npmjs.org` for one package: deprecation, latest version, release age, Node engine, peer dependencies, homepage, repository | `registry.npmjs.org`, no npm credentials sent |

All tools take `projectPath`, resolved with `realpath` and confined to `MCP_PROJECT_ROOT` (default: the current working directory). npm operations time out after 45 seconds and fail explicitly.

## Runtime modes

- **Local stdio MCP server** (`src/server.js`, the `mcp-dependency-doctor` bin): a dependency-free stdio implementation of the MCP protocol (revisions up to 2025-11-25). No accounts, no telemetry.
- **Hosted HTTP path** (`npm run start:hosted`, `src/hosted.js`): opt-in. `GET /health`, `POST /v1/package-health`, `POST /v1/inventory`, with `Authorization: Bearer mcp_...`. It reserves quota against a control plane (`CONTROL_PLANE_URL`), which sees only product, request id and units. Hosted `dependency_audit` and `dependency_outdated` are not available.

## Pricing

Per the README: the local server is free forever with no signup or quotas. A Pro plan (cloud history, team dashboard, fleet reports, hosted quotas) is planned and not live. Local counters are never used for plan enforcement.

## Known limitations

- Legacy MCP stdio protocol implementation; the official SDK migration and the 2026-07-28 stateless protocol are not implemented.
- npm projects only; full inventory needs lockfile v2 or v3.
- `dependency_audit` and `dependency_outdated` need npm installed and network access; an incomplete audit is never reported as clean.
- Registry responses are untrusted data.

## Requirements

Node.js >= 22. No runtime dependencies. `@modelcontextprotocol/sdk` is a dev dependency used only by `npm run test:integration`.
