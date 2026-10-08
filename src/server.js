#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { callTool, toolDefinitions } from './doctor.js';

// Dependency-free legacy stdio MCP transport, pinned to 2025-11-25.
const supported = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];
let initialized = false;
const send = value => process.stdout.write(JSON.stringify(value)+'\n');
export async function dispatch(request) {
  if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') return {jsonrpc:'2.0',id:request?.id ?? null,error:{code:-32600,message:'Invalid request'}};
  if (request.id === undefined) return;
  const result = value => ({jsonrpc:'2.0',id:request.id,result:value});
  if (request.method === 'initialize') {
    initialized = true;
    return result({protocolVersion:supported.includes(request.params?.protocolVersion)?request.params.protocolVersion:'2025-11-25',capabilities:{tools:{listChanged:false}},serverInfo:{name:'mcp-dependency-doctor',version:'0.1.0'}});
  }
  if (request.method === 'ping') return result({});
  if (!initialized) return {jsonrpc:'2.0',id:request.id,error:{code:-32002,message:'Initialize first'}};
  if (request.method === 'tools/list') return result({tools:toolDefinitions});
  if (request.method === 'tools/call') {
    try { const data = await callTool(request.params?.name, request.params?.arguments); return result({content:[{type:'text',text:JSON.stringify(data,null,2)}]}); }
    catch(e) { return result({isError:true,content:[{type:'text',text:e.message}]}); }
  }
  return {jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}};
}
const lines = createInterface({input:process.stdin,crlfDelay:Infinity});
for await (const line of lines) {
  if (Buffer.byteLength(line)>1024*1024) { send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request exceeds 1 MiB'}}); continue; }
  let request;
  try { request = JSON.parse(line); } catch { send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}}); continue; }
  const response = await dispatch(request);
  if(response) send(response);
}
