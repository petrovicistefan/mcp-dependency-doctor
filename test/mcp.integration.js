import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const client = new Client({ name: 'dependency-doctor-smoke', version: '1.0.0' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['src/server.js'] }));
  assert.equal(client.getServerVersion()?.name, 'mcp-dependency-doctor');
  assert.equal(client.getServerVersion()?.version, pkg.version);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['dependency_audit', 'dependency_inventory', 'dependency_outdated', 'package_health']);
  const inventory = await client.callTool({ name: 'dependency_inventory', arguments: { projectPath: '.' } });
  assert.notEqual(inventory.isError, true);
  assert.ok(JSON.parse(inventory.content[0].text).installed.length > 0);
  const escaped = await client.callTool({ name: 'dependency_inventory', arguments: { projectPath: '..' } });
  assert.equal(escaped.isError, true);
  console.log('MCP stdio integration passed');
} finally { await client.close(); }
