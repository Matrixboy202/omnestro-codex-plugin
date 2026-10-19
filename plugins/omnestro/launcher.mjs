// Public MCP transport only. No owner endpoint, private engine or provider credentials.
// Dependency-free stdio MCP (newline-delimited JSON-RPC 2.0), so the published plugin is a few readable files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
const client=process.argv[2];
if(!['codex','claude'].includes(client))throw Error('INVALID_CLIENT');
const file=process.env.OMNESTRO_MCP_CONFIG||path.join(os.homedir(),'.omnestro','extensions',client+'.json');
const setupTool={name:'omnestro_connection_status',title:'OMNESTRO setup and connection status',description:'Check OMNESTRO setup: desktop app, account, project connection and engine. Returns the next setup step for the user and, once connected, the account state and the free-trial and plan facts. Works before setup. Never grants access or reads owner credentials.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{title:'OMNESTRO setup and connection status',readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}};
// Setup order matters: the account comes before the connection, and installing or updating the plugin never renews a pairing.
const card=client==='codex'?'Codex':'Claude Code';
const next=`The user sets up OMNESTRO; never do these steps for them. 1) Install the OMNESTRO desktop app; if it is not installed yet, the user requests early access at https://omnestro.matrixboy.net. 2) In OMNESTRO > "الحساب والاشتراك" (Account and subscription), create an account or sign in; the first sign-in on a device starts the free trial, and a subscription is required after it. 3) In "الربط والإضافات" (Connect Codex and Claude) > the ${card} card, choose the project and press "ربط / تغيير المشروع" (connect / change project). Installing or updating the plugin does not renew an expired connection. Never ask an agent to read owner credentials or run approval/setup commands.`;
const accountNext='Connected, but the OMNESTRO account is not ready. Ask the user to open OMNESTRO > "الحساب والاشتراك" (Account and subscription) and create an account or sign in (the first sign-in on a device starts the free trial), or subscribe there when the trial or subscription has ended. Then check omnestro_connection_status again.';
let lastSignature='';
function connection(){
  if(!fs.existsSync(file))return {state:'NOT_PAIRED',next};
  try{
    if(fs.lstatSync(file).isSymbolicLink())throw Error();
    const c=JSON.parse(fs.readFileSync(file,'utf8')),u=new URL(c.url);
    if(c.version!==1||!/^[a-f0-9]{64}$/.test(c.token)||u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error();
    if(!Number.isFinite(c.expiresAt)||c.expiresAt<=Date.now())return {state:'EXPIRED',next};
    return {state:'CONFIGURED',config:{url:u.origin,token:c.token,expiresAt:c.expiresAt}};
  }catch{return {state:'CONFIG_ERROR',next};}
}
async function request(c,route,input){
  const r=await fetch(c.url+'/api/extensions/'+route,{method:input===undefined?'GET':'POST',headers:{authorization:'Bearer '+c.token,'content-type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)}),redirect:'error',signal:AbortSignal.timeout(10000)});
  const raw=await r.text();if(raw.length>1000000)throw Error('INVALID_RESPONSE');
  if(!r.ok)throw Error(r.status===401?'PAIRING_REJECTED':'REQUEST_REJECTED');return JSON.parse(raw);
}
async function status(){
  const c=connection();if(!c.config)return {client,state:c.state,next};
  try{const info=await request(c.config,'call',{name:'omnestro_project_info',arguments:{}}),ready=info.account?.allowed!==false;
    return {client,state:ready?'CONNECTED':'ACCOUNT_REQUIRED',projectName:info.projectName,expiresAt:c.config.expiresAt,engine:info.engine,...(info.account?{account:info.account}:{}),...(info.offer?{offer:info.offer}:{}),...(ready?{}:{next:accountNext})};}
  catch(error){return {client,state:error.message==='PAIRING_REJECTED'?'REVOKED_OR_EXPIRED':'ENGINE_UNAVAILABLE',next};}
}
const VERSIONS=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
const instructions='Use omnestro_connection_status first and relay its next step to the user. Installing OMNESTRO, signing in, the free trial and subscriptions are user actions inside the OMNESTRO app; state trial and price facts only from the offer field of that tool, never from memory. OMNESTRO runs locally on the owner-paired project with the owner subscription CLIs. Missing setup is a user action in the OMNESTRO app, never permission to read owner credentials. Exact mutation approvals, plan approval and Apply stay with the owner. Evidence is recorded, not a newly executed test. Never recursively create a mission from inside a running OMNESTRO mission.';
const failed={content:[{type:'text',text:'OMNESTRO_REQUEST_FAILED: check omnestro_connection_status, then review connection or permissions in OMNESTRO. Do not change credentials or bypass approvals.'}],isError:true};
async function listTools(){
  const c=connection();if(!c.config)return [setupTool];
  try{const catalog=await request(c.config,'catalog');return [setupTool,...catalog.tools];}catch{return [setupTool];}
}
async function callTool({name,arguments:args}={}){
  try{
    let result;
    if(name===setupTool.name){if(Object.keys(args||{}).length)throw Error('INVALID_ARGUMENTS');result=await status();}
    else{const c=connection();if(!c.config)return {content:[{type:'text',text:JSON.stringify(await status())}],isError:true};result=await request(c.config,'call',{name,arguments:args||{}});}
    return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};
  }catch{return failed;}
}
async function handle(m){
  if(m.method==='initialize'){const v=VERSIONS.includes(m.params?.protocolVersion)?m.params.protocolVersion:VERSIONS[0];return {protocolVersion:v,capabilities:{tools:{listChanged:true}},serverInfo:{name:'omnestro',title:'OMNESTRO',version:'0.2.0'},instructions};}
  if(m.method==='ping')return {};
  if(m.method==='tools/list')return {tools:await listTools()};
  if(m.method==='tools/call')return callTool(m.params);
  throw Object.assign(Error('Method not found'),{rpc:-32601});
}
const send=message=>{try{process.stdout.write(JSON.stringify(message)+'\n');}catch{}};
process.stdout.on('error',()=>{});
let initialized=false;
const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',line=>{
  if(!line.trim())return;
  if(line.length>1000000)return send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Message too large'}});
  let m;try{m=JSON.parse(line);}catch{return send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}
  if(!m||typeof m!=='object'||Array.isArray(m)||m.jsonrpc!=='2.0')return send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}});
  if(typeof m.method!=='string')return; // A response to a server request; this server sends none.
  if(m.id===undefined||m.id===null){if(m.method==='notifications/initialized')initialized=true;return;}
  handle(m).then(result=>send({jsonrpc:'2.0',id:m.id,result}),error=>send({jsonrpc:'2.0',id:m.id,error:{code:error.rpc||-32603,message:error.rpc?error.message:'Internal error'}}));
});
const refresh=setInterval(()=>{
  let signature;try{const s=fs.statSync(file);const c=connection();signature=s.mtimeMs+':'+s.size+':'+c.state;}catch{signature='missing';}
  if(signature!==lastSignature){lastSignature=signature;if(initialized)send({jsonrpc:'2.0',method:'notifications/tools/list_changed'});}
},3000);refresh.unref();
input.once('close',()=>clearInterval(refresh));