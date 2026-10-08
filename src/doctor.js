import { lstat, open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export async function projectPath(input, root = process.env.MCP_PROJECT_ROOT || process.cwd()) {
  const base = await realpath(root);
  const target = await realpath(resolve(base, input || '.'));
  const rel = relative(base, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Project must be inside MCP_PROJECT_ROOT');
  return target;
}
async function json(project, filename) {
  const base = await realpath(project);
  const actual = await realpath(resolve(base, filename));
  const rel = relative(base, actual);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error('File must be inside project directory');
  }
  if (!(await lstat(actual)).isFile()) throw new Error('Manifest and lockfile must be regular files');
  const handle = await open(actual, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    if (!(await handle.stat()).isFile()) throw new Error('Manifest and lockfile must be regular files');
    return JSON.parse(await handle.readFile('utf8'));
  } finally { await handle.close(); }
}
export async function inventory(project) {
  const manifest = await json(project, 'package.json');
  let lock;
  try { lock = await json(project, 'package-lock.json'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const declared = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies, ...manifest.optionalDependencies }).map(([name, requested]) => ({name, requested}));
  const installed = Object.entries(lock?.packages || {}).filter(([path, entry]) => path && entry.version && path.includes('node_modules/')).map(([path, entry]) => ({ name: entry.name || path.split('node_modules/').at(-1), version: entry.version, path, dev: !!entry.dev, nodeRequirement: entry.engines?.node || null }));
  return { project: manifest.name || null, lockfileVersion: lock?.lockfileVersion || null, declared, installed, warnings: !lock ? ['No package-lock.json: exact versions and transitive dependencies are unknown.'] : !lock.packages ? ['Legacy lockfile: inventory requires lockfile v2 or v3.'] : [] };
}
export async function npmReport(project, command, runner = exec) {
  // Validate both inputs before npm can read or transmit dependency data.
  await json(project, 'package.json');
  try { await json(project, 'package-lock.json'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  try {
    const { stdout } = await runner('npm', [...command, '--json', '--ignore-scripts'], { cwd: project, timeout: 45000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, npm_config_update_notifier: 'false' } });
    return JSON.parse(stdout);
  } catch (e) {
    if (e.stdout && !e.killed && e.code === 1) {
      const result = JSON.parse(e.stdout);
      if (!result.error) return result;
    }
    throw new Error(`npm ${command.join(' ')} failed: ${e.killed ? 'timeout' : e.message}`, { cause: e });
  }
}
export async function packageHealth(name, fetcher = fetch, now = Date.now()) {
  if (typeof name !== 'string' || !/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(name)) throw new Error('Invalid npm package name');
  const response = await fetcher(`https://registry.npmjs.org/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error(`Registry returned HTTP ${response.status}`);
  const data = await response.json();
  const latest = data['dist-tags']?.latest;
  const version = data.versions?.[latest];
  if (!version) throw new Error('Registry metadata has no latest release');
  const published = data.time?.[latest];
  const ageDays = published ? Math.max(0, Math.floor((now - Date.parse(published)) / 86400000)) : null;
  return { name, latest, deprecated: version.deprecated || null, published: published || null, ageDays, maintenanceSignal: ageDays > 730 ? 'No release in over two years; this does not prove abandonment.' : 'No age-based warning', nodeRequirement: version.engines?.node || null, peerDependencies: version.peerDependencies || {}, homepage: data.homepage || null, repository: data.repository || null };
}
export const toolDefinitions = [
  { name: 'dependency_inventory', description: 'Read declared dependencies and exact installed versions from npm lockfile v2/v3. No network.', inputSchema: {type:'object', properties:{projectPath:{type:'string'}}, additionalProperties:false} },
  { name: 'dependency_audit', description: 'Run read-only npm audit. Sends package versions to the configured npm registry. Never installs or fixes packages.', inputSchema:{type:'object',properties:{projectPath:{type:'string'}},additionalProperties:false} },
  { name: 'dependency_outdated', description: 'Read available updates using npm outdated. Requires network; never changes dependencies.', inputSchema:{type:'object',properties:{projectPath:{type:'string'}},additionalProperties:false} },
  { name: 'package_health', description: 'Inspect public npm package deprecation, release age, Node engine and peer requirements. Requirements are reported, not certified compatible.', inputSchema:{type:'object',properties:{name:{type:'string'}},required:['name'],additionalProperties:false} }
].map(tool => ({...tool, annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:tool.name!=='dependency_inventory'}}));
export async function callTool(name, args = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be an object');
  const definition = toolDefinitions.find(t=>t.name===name);
  if (!definition) throw new Error('Unknown tool');
  for (const key of Object.keys(args)) if (!(key in definition.inputSchema.properties)) throw new Error(`Unknown argument: ${key}`);
  if (args.projectPath !== undefined && typeof args.projectPath !== 'string') throw new Error('projectPath must be a string');
  if (name === 'package_health') return packageHealth(args.name);
  const project = await projectPath(args.projectPath);
  if (name === 'dependency_inventory') return inventory(project);
  return npmReport(project, name === 'dependency_audit' ? ['audit'] : ['outdated']);
}
