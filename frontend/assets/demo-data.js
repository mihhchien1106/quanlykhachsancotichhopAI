/* Demo invoices are opt-in and never replace existing rows. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('demo')!=='1')return;
try{
const names=['Nguyễn Minh An','Trần Ngọc Linh','Lê Hoàng Nam','Phạm Thu Hà','Hoàng Đức Anh','Vũ Mai Phương','Đặng Tuấn Kiệt','Bùi Khánh Vy','Đỗ Gia Huy','Hồ Bảo Ngọc'];
const key='grandhotel_revenue_history';const rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))throw Error('Invalid revenue data');
const now=new Date();
for(let i=0;i<60;i++){
 const id=`demo-invoice-v1-${i+1}`;if(rows.some(r=>r.id===id))continue;
 const date=new Date(now.getFullYear(),now.getMonth()-5+Math.floor(i/10),2+(i%10)*2,10+i%8,15);
 if(date>now)date.setTime(now.getTime()-(i%10)*86400000);
 const roomRevenue=[650000,950000,1500000,2200000,3500000][i%5]*(1+i%3);
 const serviceRevenue=[75000,250000,650000,180000,420000][i%5];
 rows.push({id,demo:true,createdAt:date.toISOString(),time:date.toLocaleString('vi-VN'),roomId:`P${101+i%12}`,guest:names[i%10],roomRevenue,serviceRevenue,total:roomRevenue+serviceRevenue,paymentMethod:i%2?'Chuyển khoản':'Tiền mặt'});
}
localStorage.setItem(key,JSON.stringify(rows));
const badge=document.createElement('div');badge.textContent='Đã nạp dữ liệu doanh thu giả lập (60 hóa đơn mẫu).';badge.style.cssText='position:fixed;bottom:12px;left:12px;padding:10px;background:#fff3cd;color:#664d03;border-radius:8px;z-index:9999;font:13px sans-serif';document.body.append(badge);setTimeout(()=>badge.remove(),9000);
}catch(e){console.error('Không thể nạp dữ liệu demo:',e)}
})();
