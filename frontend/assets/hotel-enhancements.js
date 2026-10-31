/* Tro Room-inspired utilities, written in vanilla JS for Grand Hotel. */
(()=>{'use strict';
const STORE='grandhotel_ui_notifications_v1';
let notifications=[];
try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(x))notifications=x.slice(0,100);}catch{}
const $=id=>document.getElementById(id);
function save(){try{localStorage.setItem(STORE,JSON.stringify(notifications.slice(0,100)));}catch{}render();}
function render(){const box=$('gh-notice-items'), badge=$('gh-notice-badge');if(!box||!badge)return;const n=notifications.filter(x=>!x.read).length;badge.hidden=!n;badge.textContent=n>99?'99+':n;
box.replaceChildren();if(!notifications.length){const e=document.createElement('p');e.className='gh-notice-empty';e.textContent='Chưa có thông báo mới';box.append(e);return;}
for(const item of notifications.slice(0,40)){const btn=document.createElement('button');btn.type='button';btn.className='gh-notice-item'+(item.read?'':' unread');const title=document.createElement('strong');title.textContent=item.title;const desc=document.createElement('div');desc.textContent=item.message||'';const dt=document.createElement('small');dt.textContent=new Date(item.createdAt).toLocaleString('vi-VN');btn.append(title,desc,dt);btn.onclick=()=>{item.read=true;save();};box.append(btn);}}
function toast(message,type='success'){return window.ghSweetToast(String(message),type);}
function notify(title,message='',type='info'){notifications.unshift({id:Date.now()+'-'+Math.random(),title:String(title),message:String(message),type,read:false,createdAt:new Date().toISOString()});notifications=notifications.slice(0,100);save();toast(title,type);}
window.GrandHotelUI={notify,toast,success:(message)=>notify('Thành công',message,'success'),error:(message)=>notify('Có lỗi',message,'error'),warning:(message)=>notify('Cảnh báo',message,'warning')};
$('gh-notice-toggle')?.addEventListener('click',()=>{const panel=$('gh-notice-panel');panel.hidden=!panel.hidden;$('gh-notice-toggle').setAttribute('aria-expanded',String(!panel.hidden));});
$('gh-notice-read-all')?.addEventListener('click',()=>{notifications.forEach(x=>x.read=true);save();});
$('gh-notice-clear')?.addEventListener('click',()=>{notifications=notifications.filter(x=>!x.read);save();});
document.addEventListener('click',e=>{if(!e.target.closest('.gh-notice-shell')){const p=$('gh-notice-panel');if(p)p.hidden=true;}});
render();
// Only paginate main list tables; avoid modal tables and embedded scroll/report tables.
const tables=[...document.querySelectorAll('#main-view table')].filter(t=>t.querySelector('tbody')&&!t.closest('[role="dialog"],dialog,.max-h-64,.max-h-80'));
for(const table of tables){const tbody=table.tBodies[0];if(!tbody)continue;let page=1,size=10,signature='';const nav=document.createElement('nav');nav.className='gh-pagination';nav.setAttribute('aria-label','Phân trang bảng');nav.hidden=true;table.parentElement?.insertAdjacentElement('afterend',nav);
function refresh(){const rows=[...tbody.children].filter(x=>x.tagName==='TR');const pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages);const sig=rows.length+'-'+page+'-'+size; // Reapply for newly rendered rows too.
rows.forEach((r,i)=>{r.style.display=i>=(page-1)*size&&i<page*size?'':'none';});nav.hidden=rows.length<=size;if(nav.hidden)return;
nav.replaceChildren();const info=document.createElement('span');info.textContent=`Hiển thị ${(page-1)*size+1}–${Math.min(page*size,rows.length)} / ${rows.length} mục`;
const c=document.createElement('div');c.className='gh-pagination-controls';const add=(label,dest,disabled,active=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.className=active?'active':'';b.onclick=()=>{page=dest;refresh();};c.append(b);};add('‹',page-1,page===1);for(let i=1;i<=pages;i++){if(i===1||i===pages||Math.abs(i-page)<=1){add(String(i),i,false,i===page);}else if(i===2||i===pages-1){const dots=document.createElement('span');dots.textContent='…';c.append(dots);}}add('›',page+1,page===pages);
const sel=document.createElement('select');sel.setAttribute('aria-label','Số dòng mỗi trang');for(const v of [5,10,20,50]){const o=document.createElement('option');o.value=v;o.textContent=v+' / trang';o.selected=v===size;sel.append(o);}sel.onchange=()=>{size=Number(sel.value);page=1;refresh();};nav.append(info,c,sel);signature=sig;}
const obs=new MutationObserver(()=>{page=1;refresh();});obs.observe(tbody,{childList:true,subtree:false});refresh();}
})();
