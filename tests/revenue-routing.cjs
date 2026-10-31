'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},remove(){},focus(){}});return elements.get(id)}
const storage=new Map();let confirmResult=true;let confirmations=0;
const ctx={console,Date,Math,JSON,URL,URLSearchParams,Blob,Map,Set,Number,String,Array,Object,Promise,parseInt,isNaN,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){},body:{dataset:{}}},setInterval(){},setTimeout(){},clearTimeout(){},requestAnimationFrame(){},fetch:async()=>({ok:true,json:async()=>({requests:[]})}),alert(){},confirm:()=>{confirmations++;return confirmResult},prompt:()=>null,addEventListener(){}};ctx.window=ctx;vm.createContext(ctx);
const root=path.join(__dirname,'..');vm.runInContext(fs.readFileSync(path.join(root,'frontend/assets/grandhotel-sweetalert.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'frontend/assets/script-03.js'),'utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);
run(`refreshRequestWorkflowViews=()=>{};logSystemActivity=()=>{};renderDashboard=()=>{};renderRooms=()=>{};renderBookingsTable=()=>{};renderServicesLog=()=>{};renderAdminControl=()=>{};renderAdminActivityCenter=()=>{};renderStaffRequests=()=>{};updateStaffNotifications=()=>{};closeInvoiceModal=()=>{};renderCustomerPortal=()=>{};updateAiModeBadge=()=>{};
ROLE_CONFIG={role:'customer'};CURRENT_USER={email:'guest@example.com'};
rooms=[{id:'P401',status:'BOOKED',guest:'Guest',guestEmail:'guest@example.com',price:100,checkin:'2026-10-31',checkout:'2026-11-02'}];
bookingRequests=[{id:'B1',roomId:'P401',customerEmail:'guest@example.com',status:'APPROVED'}];serviceRequests=[];paymentRequests=[];serviceLogs=[];revenueHistory=[];`);

(async()=>{
 let called=0;ctx.fetch=async()=>{called++;throw Error('Revenue must not call external model');};
 run(`ROLE_CONFIG={role:'admin'};CURRENT_USER={email:'admin@gmail.com'};getAiConfig=()=>({enabled:true,endpoint:'/api/ai/chat'});getAiTripProfile=()=>({});extractTripProfileFromMessage=()=>({});safeAiHtml=x=>x;revenueHistory=[{id:'R1',createdAt:'2026-08-03T00:00:00Z',roomRevenue:1000000,serviceRevenue:250000,total:1250000,serviceItems:[{name:'Spa',qty:1,total:250000}]}]`);
 for(const question of ['Tổng hợp doanh thu','So sánh doanh thu tháng 8 và tháng 9 năm 2026']){
  element('ai-input').value=question;await run('handleAiChatSubmit({preventDefault(){}})');const response=run('AI_CONVERSATION.at(-1).html');assert.match(response,/1\.250\.000/);assert(!response.includes('AVAILABLE'));assert.match(response,question.startsWith('So sánh')?/Spa/:/Tiền phòng/);
 }
 assert.equal(called,0);run("ROLE_CONFIG={role:'reception'}");element('ai-input').value='Tổng hợp doanh thu';await run('handleAiChatSubmit({preventDefault(){}})');assert.match(run('AI_CONVERSATION.at(-1).html'),/Chỉ Admin/);assert.equal(called,0);
 console.log('PASS: revenue totals and month comparison use actual ledger with online AI enabled; reception cannot access admin revenue');
})().catch(e=>{console.error(e);process.exitCode=1});
