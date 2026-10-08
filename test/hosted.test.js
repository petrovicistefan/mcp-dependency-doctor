import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHostedServer } from '../src/hosted.js';
import { consume } from '../src/control-plane-client.js';

const controlPlaneRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'mcp-control-plane');
const { Store } = await import(join(controlPlaneRoot, 'src', 'store.js'));
const { createServer } = await import(join(controlPlaneRoot, 'src', 'server.js'));

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test('hosted inventory consumes quota; manifests never reach control plane', async t => {
  const store = new Store();
  const admin = 'a'.repeat(32);
  const controlPlane = createServer({ store, adminToken: admin, limits: { free: 2, paid: 10 } });
  const controlPlaneUrl = await listen(controlPlane);

  const consumeCalls = [];
  const consumeImpl = async opts => {
    const result = await consume(opts);
    consumeCalls.push(result.payload);
    return result;
  };

  const hosted = createHostedServer({
    controlPlaneUrl,
    consumeImpl,
    registryFetch: async () => ({
      ok: true,
      json: async () => ({
        'dist-tags': { latest: '1.0.0' },
        versions: { '1.0.0': { engines: { node: '>=18' }, peerDependencies: {} } },
        time: { '1.0.0': '2024-01-01T00:00:00.000Z' },
      }),
    }),
  });
  const hostedUrl = await listen(hosted);
  t.after(async () => {
    await Promise.all([
      new Promise(resolve => controlPlane.close(resolve)),
      new Promise(resolve => hosted.close(resolve)),
    ]);
    store.close();
  });

  const adminCall = async (path, body) => {
    const response = await fetch(`${controlPlaneUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const hostedCall = async (path, token, body) => {
    const response = await fetch(`${hostedUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await adminCall('/v1/admin/accounts', { accountId: 'dep-1' })).status, 201);
  const { key } = (await adminCall('/v1/admin/keys', { accountId: 'dep-1' })).body;

  const inv = await hostedCall('/v1/inventory', key, {
    requestId: 'inv-1',
    packageJson: { name: 'demo', dependencies: { leftpad: '1.0.0' } },
    lockfile: { lockfileVersion: 3, packages: { 'node_modules/leftpad': { version: '1.0.0' } } },
  });
  assert.equal(inv.status, 200);
  assert.equal(inv.body.report.project, 'demo');
  assert.equal(inv.body.usage.product, 'dependency-doctor');

  const health = await hostedCall('/v1/package-health', key, { requestId: 'ph-1', name: 'leftpad' });
  assert.equal(health.status, 200);
  assert.equal(health.body.report.latest, '1.0.0');

  assert.equal((await hostedCall('/v1/inventory', key, {
    requestId: 'inv-2',
    packageJson: { name: 'demo' },
  })).status, 429);

  for (const payload of consumeCalls) {
    assert.deepEqual(Object.keys(payload).sort(), ['product', 'requestId', 'units']);
    assert.equal(payload.product, 'dependency-doctor');
    assert.equal('packageJson' in payload, false);
    assert.equal('name' in payload, false);
  }
});
