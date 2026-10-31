'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},remove(){},focus(){}});return elements.get(id)}
const storage=new Map();let confirmResult=true;let confirmations=0;
const ctx={console,Date,Math,JSON,URL,URLSearchParams,Blob,Map,Set,Number,String,Array,Object,Promise,parseInt,isNaN,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){},body:{dataset:{}}},setInterval(){},setTimeout(){},clearTimeout(){},requestAnimationFrame(){},fetch:async()=>({ok:true,json:async()=>({requests:[]})}),alert(){},confirm:()=>{confirmations++;return confirmResult},prompt:()=>null,addEventListener(){}};ctx.window=ctx;vm.createContext(ctx);
const root=path.join(__dirname,'..');vm.runInContext(fs.readFileSync(path.join(root,'frontend/assets/grandhotel-sweetalert.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'frontend/assets/script-03.js'),'utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);
const originalRenderStaffRequests=ctx.renderStaffRequests;
run(`refreshRequestWorkflowViews=()=>{};logSystemActivity=()=>{};renderDashboard=()=>{};renderRooms=()=>{};renderBookingsTable=()=>{};renderServicesLog=()=>{};renderAdminControl=()=>{};renderAdminActivityCenter=()=>{};renderStaffRequests=()=>{};updateStaffNotifications=()=>{};closeInvoiceModal=()=>{};renderCustomerPortal=()=>{};updateAiModeBadge=()=>{};
ROLE_CONFIG={role:'customer'};CURRENT_USER={email:'guest@example.com'};
rooms=[{id:'P401',status:'BOOKED',guest:'Guest',guestEmail:'guest@example.com',price:100,checkin:'2026-10-31',checkout:'2026-11-02'}];
bookingRequests=[{id:'B1',roomId:'P401',customerEmail:'guest@example.com',status:'APPROVED'}];serviceRequests=[];paymentRequests=[];serviceLogs=[];revenueHistory=[];`);

(async()=>{
 const seen=new Map(),notices=[];ctx.sessionStorage={getItem:k=>seen.get(k)||null,setItem:(k,v)=>seen.set(k,v),removeItem:k=>seen.delete(k)};ctx.ghSweetToast=(message)=>notices.push(message);
 for(const role of ['admin','reception']){
  run(`ROLE_CONFIG={role:'${role}'};CURRENT_USER={email:'${role}@example.com'};rooms=[{id:'P401',status:'OCCUPIED',guestEmail:'guest@example.com',price:100,checkin:'2026-10-31',checkout:'2026-11-01'}];bookingRequests=[];serviceRequests=[];adminSupportRequests=[];serviceLogs=[];revenueHistory=[];paymentRequests=[{id:'PAY-'+ROLE_CONFIG.role,roomId:'P401',customerEmail:'guest@example.com',customerName:'Guest',method:'CASH',total:100,roomRevenue:100,serviceRevenue:0,status:'PENDING',createdAt:new Date().toISOString()}]`);
  originalRenderStaffRequests();assert.match(element('staff-payment-requests').innerHTML,/Xác nhận/);assert.match(element('staff-payment-requests').innerHTML,/Tiền mặt — không yêu cầu ảnh bill/);assert.equal(element('request-payment-pending').textContent,1);
  run('notifyStaffPendingPayments();notifyStaffPendingPayments()');assert.equal(notices.length,role==='admin'?1:2);
  await run("adminApprovePayment('PAY-'+ROLE_CONFIG.role)");assert.equal(run('paymentRequests[0].status'),'APPROVED');assert.equal(run('paymentRequests[0].decidedByRole'),role);assert.equal(run('revenueHistory.length'),1);
  run("adminSupportRequests=[{id:'S1',actorRole:'customer',actorEmail:'guest@example.com',actorName:'Guest',message:'Help',status:'PENDING'}]");run("adminSetSupportProcessing('S1')");assert.equal(run('adminSupportRequests[0].status'),'PROCESSING');element('reply-S1').value='Đã hỗ trợ';run("adminReplySupportInline('S1')");assert.equal(run('adminSupportRequests[0].status'),'DONE');assert.equal(run('adminSupportRequests[0].handledByRole'),role);
 }
 console.log('PASS: Admin and reception see pending payments, receive one alert per request, approve payment and respond to customer support');
 const html=fs.readFileSync(path.join(root,'frontend/index.html'),'utf8');assert.equal((html.match(/id="staff-payment-requests"/g)||[]).length,1);console.log('PASS: staff payment list exists exactly once in the requests screen');
})().catch(e=>{console.error(e);process.exitCode=1});
