'use strict';
// Explicit demo-only command. Never changes an existing account.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const names=['Nguyễn Minh An','Trần Ngọc Linh','Lê Hoàng Nam','Phạm Thu Hà','Hoàng Đức Anh','Vũ Mai Phương','Đặng Tuấn Kiệt','Bùi Khánh Vy','Đỗ Gia Huy','Hồ Bảo Ngọc'];
const file=path.join(__dirname,'data','accounts.json');
fs.mkdirSync(path.dirname(file),{recursive:true});
const users=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
let added=0;
names.forEach((name,i)=>{const email=`khach${String(i+1).padStart(2,'0')}@example.com`;if(users.some(u=>u.email===email))return;const salt=crypto.randomBytes(16).toString('hex');users.push({id:`demo-customer-${i+1}`,name,email,phone:'',hash:salt+':'+crypto.scryptSync('DemoHotel@123',salt,64).toString('hex'),verified:true,verification:null,reset:null,createdAt:new Date().toISOString(),demo:true});added++});
const tmp=file+'.seed.tmp';fs.writeFileSync(tmp,JSON.stringify(users,null,2),{mode:0o600});fs.renameSync(tmp,file);
console.log(`Added ${added} demo customers; existing accounts preserved. Login: khach01@example.com through khach10@example.com / DemoHotel@123`);
