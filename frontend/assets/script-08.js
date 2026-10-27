
window.addEventListener('load',function(){
  const quick=document.getElementById('chat-quick-prompts');
  if(!quick)return;
  // Các gợi ý ít hơn và hướng thẳng tới thao tác thường dùng.
  function fillCompactShortcuts(){
    if(!window.ROLE_CONFIG || !quick)return;
    const role=ROLE_CONFIG.role;
    const choices=role==='admin' ? [
      ['📊 Doanh thu','Tổng hợp doanh thu và các khoản chưa thanh toán'],
      ['🛏 Phòng trống','Cho biết số phòng trống và phòng đang sử dụng'],
      ['📋 Yêu cầu','Tổng hợp các yêu cầu đang chờ xử lý']
    ] : role==='reception' ? [
      ['🛏 Phòng trống','Cho biết phòng nào đang trống'],
      ['📅 Đặt phòng','Tóm tắt các đặt phòng cần xử lý'],
      ['🔔 Yêu cầu','Cho tôi biết các yêu cầu dịch vụ đang chờ']
    ] : [
      ['🛏 Chọn phòng','Tư vấn phòng phù hợp với nhu cầu và ngân sách của tôi'],
      ['🍽 Dịch vụ','Gợi ý dịch vụ và đồ ăn của khách sạn'],
      ['💳 Chi phí','Kiểm tra và hướng dẫn tổng chi phí của tôi']
    ];
    quick.replaceChildren();
    choices.forEach(([label,prompt])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=prompt;b.addEventListener('click',()=>{if(typeof askAiQuick==='function')askAiQuick(prompt);else if(typeof setAiPrompt==='function')setAiPrompt(prompt)});quick.appendChild(b)});
    const trip=document.createElement('button');trip.type='button';trip.textContent='🧭 Du lịch';trip.title='Lập kế hoạch theo ngân sách';trip.addEventListener('click',()=>{if(typeof openTravelAdvisor==='function')openTravelAdvisor()});quick.appendChild(trip);
    if(role==='customer'){
      const staff=document.createElement('button');staff.type='button';staff.textContent='🎧 Nhân viên';staff.title='Liên hệ lễ tân';staff.addEventListener('click',()=>{document.getElementById('chat-extras').open=true;if(typeof setCustomerConsultMode==='function')setCustomerConsultMode('staff')});quick.appendChild(staff);
    }
  }
  fillCompactShortcuts();
  if(typeof window.chatRoleUI==='function'){
    const original=window.chatRoleUI;
    window.chatRoleUI=function(){const result=original.apply(this,arguments);fillCompactShortcuts();return result};
  }
  const heading=document.getElementById('ai-module-subtitle');if(heading)heading.textContent='Hỏi nhanh về phòng, dịch vụ và chuyến đi';
  const entry=document.getElementById('ai-input');if(entry)entry.placeholder='Nhập câu hỏi của bạn…';
  const extra=document.querySelector('#chat-extras>summary');if(extra)extra.textContent='Tùy chọn nâng cao · tư vấn trực tiếp · lập kế hoạch';
  const planner=document.getElementById('customer-ai-planner');if(planner){const note=planner.querySelector('p:last-child');if(note?.textContent.includes('Nhập số tiền như'))note.textContent='Ngân sách tính theo người/ngày. Ví dụ: 1.500.000đ.'}
});
