import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHostedServer } from '../src/hosted.js';
import { consume } from '../src/control-plane-client.js';

const KEY = 'mcp_test_key';

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function createFakeControlPlane({ limit = 2 } = {}) {
  const seen = new Map();
  let used = 0;
  const events = [];
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST' || new URL(req.url, 'http://x').pathname !== '/v1/usage/consume') {
      return send(404, { error: 'not_found' });
    }
    if ((req.headers.authorization ?? '') !== `Bearer ${KEY}`) return send(401, { error: 'unauthorized' });
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    events.push(body);
    const prev = seen.get(body.requestId);
    if (prev !== undefined) {
      if (prev !== body.units) return send(409, { error: 'request_id_conflict' });
      return send(200, { allowed: true, duplicate: true, used, limit });
    }
    if (used + body.units > limit) return send(429, { allowed: false, used, limit, error: 'quota_exceeded' });
    used += body.units;
    seen.set(body.requestId, body.units);
    return send(200, { allowed: true, duplicate: false, used, limit });
  });
  return { server, events };
}

test('hosted inventory consumes quota; manifests never reach control plane', async t => {
  const { server: controlPlane, events } = createFakeControlPlane();
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
  });

  const hostedCall = async (path, token, body) => {
    const response = await fetch(`${hostedUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };

  const inv = await hostedCall('/v1/inventory', KEY, {
    requestId: 'inv-1',
    packageJson: { name: 'demo', dependencies: { leftpad: '1.0.0' } },
    lockfile: { lockfileVersion: 3, packages: { 'node_modules/leftpad': { version: '1.0.0' } } },
  });
  assert.equal(inv.status, 200);
  assert.equal(inv.body.report.project, 'demo');
  assert.equal(inv.body.usage.product, 'dependency-doctor');

  const health = await hostedCall('/v1/package-health', KEY, { requestId: 'ph-1', name: 'leftpad' });
  assert.equal(health.status, 200);
  assert.equal(health.body.report.latest, '1.0.0');

  assert.equal((await hostedCall('/v1/inventory', KEY, {
    requestId: 'inv-2',
    packageJson: { name: 'demo' },
  })).status, 429);

  for (const payload of consumeCalls) {
    assert.deepEqual(Object.keys(payload).sort(), ['product', 'requestId', 'units']);
    assert.equal(payload.product, 'dependency-doctor');
    assert.equal('packageJson' in payload, false);
    assert.equal('name' in payload, false);
  }
  for (const event of events) {
    assert.deepEqual(Object.keys(event).sort(), ['product', 'requestId', 'units']);
    assert.equal('packageJson' in event, false);
  }
});
