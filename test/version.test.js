import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { VERSION } from '../src/version.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('package.json, server.json and the runtime version agree', () => {
  const pkg = readJson('../package.json');
  const server = readJson('../server.json');
  assert.match(pkg.version, /^\d+\.\d+\.\d+/);
  assert.equal(server.version, pkg.version, 'server.json top-level version');
  assert.ok(server.packages.length > 0);
  for (const entry of server.packages) assert.equal(entry.version, pkg.version, 'server.json packages[].version');
  assert.equal(VERSION, pkg.version, 'exported VERSION');

  const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'version-test', version: '1.0.0' } } };
  const run = spawnSync(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url), input: `${JSON.stringify(initialize)}\n`, encoding: 'utf8', timeout: 10000 });
  assert.equal(run.status, 0, run.stderr);
  const response = JSON.parse(run.stdout.trim().split('\n')[0]);
  assert.equal(response.result.serverInfo.version, pkg.version, 'serverInfo.version');
});
