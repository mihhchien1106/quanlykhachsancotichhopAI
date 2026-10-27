
const cleanRestoreConversation=restoreAiConversation;
restoreAiConversation=function(){const box=document.getElementById('ai-chat-history');box.innerHTML='<div class="chat-welcome"><div class="chat-symbol" style="margin:auto">✦</div><h3>Tôi có thể giúp gì cho bạn?</h3><p>Chọn gợi ý phía trên hoặc nhập câu hỏi để bắt đầu.</p></div>';AI_TRIP_CONTEXT=null;cleanRestoreConversation()};
const cleanSubmit=handleAiChatSubmit;
handleAiChatSubmit=async function(e){if(document.getElementById('ai-input').value.trim())document.querySelector('#ai-chat-history .chat-welcome')?.remove();return cleanSubmit(e)};
