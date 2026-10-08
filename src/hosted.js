import http from 'node:http';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inventory, packageHealth } from './doctor.js';
import { assertControlPlaneUrl, consume } from './control-plane-client.js';

const PRODUCT = 'dependency-doctor';
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const MAX_BODY = 2 * 1024 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'body_too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) throw new HttpError(400, 'invalid_json');
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
    return body;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

function bearer(req) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ') || !auth.slice(7)) throw new HttpError(401, 'unauthorized');
  return auth.slice(7);
}

async function inventoryFromObjects(packageJson, lockfile, workRoot) {
  const root = await realpath(workRoot);
  const dir = await mkdtemp(join(root, 'dep-'));
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify(packageJson));
    if (lockfile !== undefined) await writeFile(join(dir, 'package-lock.json'), JSON.stringify(lockfile));
    return await inventory(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function createHostedServer({ controlPlaneUrl, consumeImpl = consume, fetchImpl, registryFetch, workRoot = tmpdir() }) {
  const baseUrl = assertControlPlaneUrl(controlPlaneUrl);
  return http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(body));
    };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/health' && req.method === 'GET') return send(200, { status: 'ok' });

      const apiKey = bearer(req);
      if (req.method !== 'POST' || (path !== '/v1/package-health' && path !== '/v1/inventory')) {
        throw new HttpError(404, 'not_found');
      }

      const body = await readBody(req);
      if (!validId(body.requestId)) throw new HttpError(400, 'invalid_request_id');
      const units = body.units === undefined ? 1 : body.units;
      if (!Number.isSafeInteger(units) || units < 1) throw new HttpError(400, 'invalid_units');

      if (path === '/v1/package-health') {
        if (typeof body.name !== 'string') throw new HttpError(400, 'invalid_name');
      } else if (!body.packageJson || typeof body.packageJson !== 'object' || Array.isArray(body.packageJson)) {
        throw new HttpError(400, 'invalid_package_json');
      } else if (body.lockfile !== undefined && (typeof body.lockfile !== 'object' || Array.isArray(body.lockfile))) {
        throw new HttpError(400, 'invalid_lockfile');
      }

      const reservation = await consumeImpl({ baseUrl, apiKey, requestId: body.requestId, units, fetchImpl });
      if (!reservation.ok) {
        const status = reservation.status === 429 || reservation.status === 401 || reservation.status === 409
          ? reservation.status
          : reservation.status >= 400 && reservation.status < 600 ? reservation.status : 502;
        throw new HttpError(status, reservation.error ?? 'control_plane_error');
      }

      let report;
      try {
        report = path === '/v1/package-health'
          ? await packageHealth(body.name, registryFetch ?? fetch)
          : await inventoryFromObjects(body.packageJson, body.lockfile, workRoot);
      } catch (error) {
        throw new HttpError(400, error.message || 'analysis_failed');
      }

      return send(200, {
        report,
        usage: {
          product: PRODUCT,
          requestId: body.requestId,
          units,
          duplicate: reservation.duplicate,
          used: reservation.used,
          limit: reservation.limit,
        },
      });
    } catch (error) {
      if (!error.status) console.error('Hosted request failure:', error.code ?? error.name);
      send(error.status ?? 500, { error: error.status ? error.message : 'internal_error' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controlPlaneUrl = process.env.CONTROL_PLANE_URL;
  const workRoot = process.env.HOSTED_WORK_ROOT ?? tmpdir();
  const server = createHostedServer({ controlPlaneUrl, workRoot });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.listen(Number(process.env.PORT ?? 3101), process.env.HOST ?? '127.0.0.1', () => {
    console.log('Dependency Doctor hosted listening');
  });
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
