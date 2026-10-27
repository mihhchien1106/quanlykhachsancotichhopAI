// Minimal independent JSON API. Node >=18; no third-party dependencies.
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const STORE = path.join(DATA_DIR, 'hotel-state.json');
const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5500';
const MAX_BYTES = 3_000_000;
const send = (res, status, value) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(value)); };
let queue = Promise.resolve();
async function readState(){try{return JSON.parse(await fs.readFile(STORE,'utf8'));}catch(e){if(e.code==='ENOENT')return {version:1,updatedAt:null,data:{}};throw e;}}
async function writeState(value){await fs.mkdir(DATA_DIR,{recursive:true});const tmp=STORE+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(value,null,2),'utf8');await fs.rename(tmp,STORE);}
const server = http.createServer(async(req,res)=>{
 if(req.headers.origin && req.headers.origin!==ORIGIN){return send(res,403,{error:'Origin not permitted'});}
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});return res.end();}
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,service:'grand-hotel-backend'});
 if(pathname==='/api/state'&&req.method==='GET') {try{return send(res,200,await readState());}catch(e){console.error(e);return send(res,500,{error:'Unable to read state'});}}
 if(pathname==='/api/state'&&req.method==='PUT'){
  const chunks=[];let size=0;
  try{for await(const chunk of req){size+=chunk.length;if(size>MAX_BYTES)throw Error('Payload too large');chunks.push(chunk);}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!data||typeof data!=='object'||Array.isArray(data))return send(res,400,{error:'Expected JSON object'});
   const state={version:1,updatedAt:new Date().toISOString(),data};
   queue=queue.catch(()=>{}).then(()=>writeState(state));await queue;return send(res,200,{ok:true,updatedAt:state.updatedAt});
  }catch(e){return send(res,size>MAX_BYTES?413:400,{error:'Invalid JSON or storage error'});}
 }
 return send(res,404,{error:'Not found'});
});
server.listen(PORT,HOST,()=>console.log(`Grand Hotel API: http://${HOST}:${PORT}`));
