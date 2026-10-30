'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const crypto=require('node:crypto');
const file=path.join(__dirname,'data','accounts.json');
let queue=Promise.resolve();const sessions=new Map();const attempts=new Map();
const digest=t=>crypto.createHash('sha256').update(t).digest('hex');
const random=()=>crypto.randomBytes(32).toString('hex');
const passwordHash=p=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(p,salt,64).toString('hex')};
const match=(p,h)=>{try{const [salt,hash]=h.split(':');return crypto.timingSafeEqual(crypto.scryptSync(p,salt,64),Buffer.from(hash,'hex'))}catch{return false}};
async function read(){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return [];throw e}}
async function update(fn){let result;queue=queue.catch(()=>{}).then(async()=>{const users=await read();result=await fn(users);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(users,null,2),{mode:0o600});await fs.rename(file+'.tmp',file)});await queue;return result}
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const norm=e=>String(e||'').trim().toLowerCase();
const safe=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,role:'customer',verified:u.verified});
async function sendEmail(to,subject,body){
 if(process.env.SMTP_HOST){
  let nm;try{nm=require('nodemailer')}catch{throw error('Cần chạy npm install trong backend để gửi email',503)}
  const transport=nm.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
  await transport.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to,subject,text:body});return 'email';
 }
 console.info('[DEV EMAIL]',to,subject,'\n'+body);return 'console';
}
function throttle(req){const ip=req.socket.remoteAddress||'local',now=Date.now();const v=attempts.get(ip)||{n:0,until:now+600000};if(now>v.until){v.n=0;v.until=now+600000}v.n++;attempts.set(ip,v);if(v.n>35)throw error('Quá nhiều yêu cầu. Thử lại sau 10 phút.',429)}
function link(req,p,t){const host=req.headers.host||'127.0.0.1:4000';return `http://${host}/?${p}=${encodeURIComponent(t)}`}
async function handle(req,pathname,parse,send){
 throttle(req);
 const data=await parse(req,12000);
 if(pathname==='/api/auth/register'){
  const name=String(data.name||'').trim().slice(0,100),email=norm(data.email),phone=String(data.phone||'').trim(),pw=String(data.password||'');
  if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||pw.length<8||pw.length>128)throw error('Nhập họ tên, email hợp lệ và mật khẩu ít nhất 8 ký tự.');
  const token=random();await update(users=>{if(users.some(u=>u.email===email))throw error('Email này đã được đăng ký.',409);users.push({id:crypto.randomUUID(),name,email,phone,hash:passwordHash(pw),verified:false,verification:{hash:digest(token),until:Date.now()+86400000},reset:null,createdAt:new Date().toISOString()})});
  const delivery=await sendEmail(email,'Xác nhận tài khoản Grand Hotel',`Bấm vào liên kết xác nhận (hết hạn sau 24 giờ): ${link(req,'verify',token)}`);
  return send(req.res,201,{ok:true,message:delivery==='email'?'Đã gửi email xác nhận. Hãy kiểm tra hộp thư.':'Đã tạo tài khoản. Chưa cấu hình SMTP: xem liên kết xác nhận trong Terminal backend.',delivery});
 }
 if(pathname==='/api/auth/verify'){
  const token=String(data.token||'');const u=await update(users=>{const user=users.find(x=>x.verification?.hash===digest(token)&&x.verification.until>Date.now());if(!user)throw error('Liên kết xác nhận không hợp lệ hoặc hết hạn.');user.verified=true;user.verification=null;return safe(user)});return send(req.res,200,{ok:true,user:u});
 }
 if(pathname==='/api/auth/login'){
  const email=norm(data.email),pw=String(data.password||'');const user=(await read()).find(u=>u.email===email);
  if(!user||!match(pw,user.hash))throw error('Email hoặc mật khẩu không đúng.',401);
  if(!user.verified)throw error('Tài khoản chưa xác nhận email. Hãy mở liên kết đã gửi.',403);
  const token=random();sessions.set(digest(token),{id:user.id,expiry:Date.now()+86400000});
  req.res.setHeader('Set-Cookie',`gh_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
  return send(req.res,200,{ok:true,user:safe(user)});
 }
 if(pathname==='/api/auth/forgot'){
  const email=norm(data.email),user=(await read()).find(u=>u.email===email);let delivery='none';
  if(user){const token=random();await update(users=>{const u=users.find(x=>x.id===user.id);u.reset={hash:digest(token),until:Date.now()+1800000}});delivery=await sendEmail(email,'Đặt lại mật khẩu Grand Hotel',`Liên kết đặt lại mật khẩu (hết hạn sau 30 phút): ${link(req,'reset',token)}`)}
  return send(req.res,200,{ok:true,message:'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi. Nếu chưa cấu hình SMTP, kiểm tra Terminal backend.',delivery:process.env.SMTP_HOST?'email':'console'});
 }
 if(pathname==='/api/auth/reset'){
  const token=String(data.token||''),pw=String(data.password||'');if(pw.length<8||pw.length>128)throw error('Mật khẩu mới phải có ít nhất 8 ký tự.');
  await update(users=>{const user=users.find(x=>x.reset?.hash===digest(token)&&x.reset.until>Date.now());if(!user)throw error('Liên kết đặt lại mật khẩu không hợp lệ hoặc hết hạn.');user.hash=passwordHash(pw);user.reset=null;for(const [k,v] of sessions)if(v.id===user.id)sessions.delete(k)});
  return send(req.res,200,{ok:true,message:'Đã đổi mật khẩu. Bạn có thể đăng nhập.'});
 }
 throw error('Không tìm thấy API',404);
}
module.exports={handle};
