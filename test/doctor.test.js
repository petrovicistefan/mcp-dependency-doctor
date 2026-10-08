import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {inventory,projectPath,npmReport,packageHealth,callTool} from '../src/doctor.js';

test('inventory reports exact transitive versions and engines',async t=>{
 const root=await mkdtemp(join(tmpdir(),'doctor-')); t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'package.json'),JSON.stringify({name:'fixture',dependencies:{foo:'^1.0.0'}}));
 let result=await inventory(root); assert.equal(result.warnings.length,1);
 await writeFile(join(root,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'':{},'node_modules/foo':{version:'1.2.0',engines:{node:'>=20'}},'node_modules/foo/node_modules/bar':{version:'2.0.0'}}}));
 result=await inventory(root); assert.equal(result.installed.length,2); assert.equal(result.installed[1].name,'bar'); assert.equal(result.installed[0].nodeRequirement,'>=20');
});
test('project boundary rejects traversal and symlink escape',async t=>{
 const root=await mkdtemp(join(tmpdir(),'doctor-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'project')); await symlink(tmpdir(),join(root,'escape'));
 assert.equal(await projectPath('project',root),join(root,'project'));
 await assert.rejects(projectPath('..',root),/inside/);await assert.rejects(projectPath('escape',root),/inside/);
});
test('audit exit 1 is findings, registry errors are failures',async()=>{
 const runner=async(file,args)=>{assert.equal(file,'npm');assert.ok(args.includes('--ignore-scripts'));throw Object.assign(new Error('findings'),{code:1,stdout:'{"vulnerabilities":{"foo":{}}}'});};
 assert.ok((await npmReport('.', ['audit'],runner)).vulnerabilities.foo);
 await assert.rejects(npmReport('.',['audit'],async()=>{throw Object.assign(new Error('registry'),{code:1,stdout:'{"error":{"code":"E403"}}'});}),/failed/);
});
test('health distinguishes old release from abandonment and rejects invalid names',async()=>{
 const fetcher=async url=>{assert.equal(url,'https://registry.npmjs.org/%40scope%2Ffoo');return {ok:true,json:async()=>({'dist-tags':{latest:'1.0.0'},versions:{'1.0.0':{deprecated:'Use bar',engines:{node:'>=22'}}},time:{'1.0.0':'2020-01-01'}})};};
 const result=await packageHealth('@scope/foo',fetcher,Date.parse('2026-01-01')); assert.match(result.maintenanceSignal,/does not prove/);assert.equal(result.deprecated,'Use bar');
 await assert.rejects(packageHealth('https://localhost',fetcher),/Invalid/);
 await assert.rejects(callTool('dependency_inventory',{projectPath:12}),/string/);
});
test('real stdio handshake, list, call, errors and notifications',async()=>{
 const child=spawn(process.execPath,['src/server.js'],{cwd:new URL('..',import.meta.url),stdio:['pipe','pipe','pipe']});
 let output='';let stderr='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>stderr+=x);
 const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(stderr)));});
 const messages=[{id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}},{method:'notifications/initialized'},{id:2,method:'tools/list'},{id:3,method:'tools/call',params:{name:'dependency_inventory',arguments:{}}},{id:4,method:'tools/call',params:{name:'invalid'}},{id:5,method:'invalid'}];
 child.stdin.end(messages.map(x=>JSON.stringify({jsonrpc:'2.0',...x})).join('\n')+'\n{bad}\n');await done;
 const results=output.trim().split('\n').map(x=>JSON.parse(x)); assert.equal(results.length,6); assert.equal(results[0].result.protocolVersion,'2025-11-25');assert.equal(results[1].result.tools.length,4);assert.match(results[2].result.content[0].text,/mcp-dependency-doctor/);assert.equal(results[3].result.isError,true);assert.equal(results[4].error.code,-32601);assert.equal(results[5].error.code,-32700);
});
