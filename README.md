# MCP Dependency Doctor

Read-only dependency diagnostics for AI coding agents. Free local inventory and npm audits, without an account. Node.js 22+, npm required. Initial scope: npm projects with package-lock.json v2/v3.

## Run from source

```sh
git clone https://github.com/petrovicistefan/mcp-dependency-doctor.git
cd mcp-dependency-doctor
npm test
MCP_PROJECT_ROOT=/absolute/path/to/your/project node src/server.js
```

npm publication is pending. This implementation has no third-party runtime dependencies.

## Claude Desktop / compatible stdio client

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

## Tools

| Tool | Purpose | Network |
| --- | --- | --- |
| dependency_inventory | Manifest + exact lockfile versions, including transitive dependencies | No |
| dependency_audit | npm audit JSON report, including transitive vulnerabilities | Configured npm registry |
| dependency_outdated | Current, wanted and latest versions from npm | Configured npm registry |
| package_health | Public package deprecation, release age, engines and peer requirements | registry.npmjs.org |

Project tools accept `projectPath`, relative to MCP_PROJECT_ROOT. Example agent request: “Audit this project, inspect deprecated packages and suggest an upgrade order. Do not change files.”

The server never runs install, audit fix, or package lifecycle scripts. Network tools disclose package names and versions to registries. Registry authentication follows the user's npm configuration. Public package health does not use npm credentials. Project paths are confined through realpath; do not expose the server to untrusted remote clients. Treat registry text and package metadata as untrusted data, never instructions. No telemetry or cloud uploads.

## Limitations

MVP uses legacy MCP stdio protocol revisions through 2025-11-25. The 2026-07-28 stateless protocol is not implemented. Official SDK migration and interoperability testing with real clients are planned before publication.

Node and peer requirements are reported, not resolved: there is no full compatibility solver yet. Old releases are a maintenance signal, not proof of abandonment. No automatic remediation. npm audit coverage depends on the registry and lockfile. npm network operations time out after 45 seconds and fail explicitly; an incomplete audit is never reported as clean. Remote registry smoke tests were blocked in the development environment; unit tests use deterministic fixtures.

## Hosted path (quotas via control plane)

The local stdio MCP stays fully useful without an account. Quotas apply only on a separate hosted HTTP process that reserves units on mcp-control-plane before analysis.

```sh
cp .env.example .env   # set CONTROL_PLANE_URL
npm run start:hosted   # default 127.0.0.1:3101
```

| Method | Path | Body |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/v1/package-health` | `{ "requestId", "name" }` |
| POST | `/v1/inventory` | `{ "requestId", "packageJson", "lockfile"? }` |

Requires `Authorization: Bearer mcp_…`. Hosted `dependency_audit` / `dependency_outdated` are not in this MVP. Manifests and package names stay on the hosted host; control-plane sees only `product`, `requestId`, and `units`.

## Roadmap and commercial boundary

Free: local inventory, basic audit and health diagnostics without signup. Pro (planned): cloud history, monitoring, team dashboard and reports; no paid plan is live yet. Hosted quotas use the control-plane path above; local counters are not used for paid enforcement.

Next: official MCP SDK; semver-aware Node/peer compatibility; upgrade plan; pnpm/yarn; MCP Registry manifest once repository and npm ownership are verified; shared cloud auth/billing. No server.json claiming unpublished npm artifacts is included.

## Development

```sh
npm test
npm run check
npm pack --dry-run
```

Protocol: https://modelcontextprotocol.io/specification/2025-11-25
Audit: https://docs.npmjs.com/cli/v11/commands/npm-audit/
