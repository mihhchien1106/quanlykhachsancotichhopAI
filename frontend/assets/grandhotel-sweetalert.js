/* Grand Hotel dialog gateway; SweetAlert2 11.26.25 is bundled locally. */
(function () {
  'use strict';
  const nativeAlert=window.alert.bind(window), nativeConfirm=window.confirm.bind(window), nativePrompt=window.prompt.bind(window);
  let pending=Promise.resolve();
  const enqueue=task=>{const result=pending.then(task,task);pending=result.catch(()=>{});return result;};
  const defaults={heightAuto:false,confirmButtonText:'Đã hiểu',cancelButtonText:'Hủy',confirmButtonColor:'#b77920',cancelButtonColor:'#64748b',customClass:{popup:'gh-swal-popup'},returnFocus:true};
  function fire(options){return enqueue(()=>window.Swal.fire({...defaults,...options}));}
  function iconFor(text){return /lỗi|không thể|thất bại|không hợp lệ|không đúng|vui lòng|chưa|hết|giới hạn|không còn/i.test(text)?'warning':/thành công|đã |hoàn tất/i.test(text)?'success':'info';}
  window.ghSweetNotify=function(message,options={}){
    const text=String(message??'');
    if(!window.Swal)return Promise.resolve(nativeAlert(text));
    return fire({title:options.title||'Grand Hotel',text,icon:options.icon||iconFor(text),...options});
  };
  window.ghSweetConfirm=async function(message,options={}){
    if(!window.Swal)return nativeConfirm(String(message??''));
    const result=await fire({title:'Xác nhận thao tác',text:String(message??''),icon:'question',showCancelButton:true,confirmButtonText:'Đồng ý',reverseButtons:true,focusCancel:true,...options});
    return !!result.isConfirmed;
  };
  window.ghSweetPrompt=async function(message,value='',options={}){
    if(!window.Swal)return nativePrompt(String(message??''),String(value??''));
    const result=await fire({title:'Nhập thông tin',text:String(message??''),input:'textarea',inputValue:String(value??''),inputAttributes:{maxlength:'1000','aria-label':String(message??'Nhập thông tin')},showCancelButton:true,confirmButtonText:'Lưu',reverseButtons:true,...options});
    return result.isConfirmed?String(result.value??''):null;
  };
  window.ghSweetToast=function(message,type='info'){
    if(!window.Swal)return window.ghSweetNotify(message);
    const icon=['success','error','warning','info','question'].includes(type)?type:'info';
    return fire({toast:true,position:'top-end',title:String(message??''),icon,showConfirmButton:false,timer:3500,timerProgressBar:true});
  };
  window.alert=message=>window.ghSweetNotify(message);
  // Replace browser validation bubbles with the same notification style.
  let validationPending=false;
  document.addEventListener('invalid',event=>{
    event.preventDefault();
    if(validationPending)return;
    validationPending=true;
    const field=event.target;
    window.ghSweetNotify(field.validationMessage||'Vui lòng kiểm tra thông tin đã nhập.',{title:'Kiểm tra thông tin',icon:'warning'}).then(()=>field.focus()).finally(()=>{validationPending=false;});
  },true);
})();
