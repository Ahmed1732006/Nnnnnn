/* =====================================================================
   session-ended.js — شاشة "انتهت الجلسة" (للعضو اللي فاتح الموقع وقت التحديث)
   ملف مستقل: حطّه في أي صفحة داخل الموقع (أو في index.html) وبعدين:

     SessionEnded.show({ loginUrl:'index.html', seconds:6 });

   - بتظهر شاشة كبيرة فيها عدّاد، وبعدها بتحوّل العضو لصفحة تسجيل الدخول.
   - الخيارات (كلها اختيارية): title, message, seconds, loginUrl, preview(true = معاينة بدون تحويل), onDone
   - إضافات: badge (نص الشارة)، manual:true (من غير عدّاد ولا تحويل تلقائي — العضو يضغط الزر بنفسه)
   - SessionEnded.hide() لإغلاقها.
   - مفيش اتصال بأي قاعدة بيانات هنا: إنت اللي هتستدعيها وقت ما الأدمن يفعّل التحديث.
   ===================================================================== */
(()=>{
const CSS=`
.se{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;direction:rtl;font-family:"Cairo",system-ui,-apple-system,"Segoe UI",sans-serif;background:rgba(4,8,13,.9);opacity:0;transition:opacity .4s}
.se.show{opacity:1}.se *{box-sizing:border-box}
.se-card{position:relative;width:min(540px,100%);max-height:94vh;overflow:auto;padding:40px 34px 28px;border-radius:30px;text-align:center;color:#f2f4f7;
 background:radial-gradient(110% 70% at 50% 0%,hsl(var(--h,262) calc(70% * var(--k,1)) 38%/.34),transparent 62%),linear-gradient(180deg,#1a2430,#0e141c);
 border:1.5px solid hsl(var(--h,262) calc(55% * var(--k,1)) 58%/.5);box-shadow:0 40px 100px rgba(0,0,0,.65),0 0 70px hsl(var(--h,262) calc(70% * var(--k,1)) 52%/.25);
 transform:scale(.84) translateY(26px);transition:transform .75s cubic-bezier(.34,1.56,.64,1)}
.se.show .se-card{transform:none}
.se-ring{position:relative;width:132px;height:132px;margin:0 auto 18px}
.se-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.se-ring circle{fill:none;stroke-width:7;stroke-linecap:round}.se-ring .bg{stroke:rgba(255,255,255,.08)}
.se-ring .fg{stroke:hsl(var(--h,262) calc(85% * var(--k,1)) 68%);stroke-dasharray:326.7;stroke-dashoffset:0;transition:stroke-dashoffset 1s linear;filter:drop-shadow(0 0 8px hsl(var(--h,262) calc(85% * var(--k,1)) 60%/.7))}
.se-n{position:absolute;inset:0;display:grid;place-items:center;font:700 56px "Amiri","Noto Naskh Arabic",serif;color:#fff;text-shadow:0 0 22px hsl(var(--h,262) calc(85% * var(--k,1)) 62%/.8)}
.se-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;margin-bottom:14px;border-radius:999px;font:700 .8rem "Cairo",sans-serif;
 background:hsl(var(--h,262) calc(70% * var(--k,1)) 50%/.18);color:hsl(var(--h,262) calc(90% * var(--k,1)) 84%)}
.se-badge i{width:8px;height:8px;border-radius:50%;background:currentColor;animation:sePulse 1.4s ease-in-out infinite}
@keyframes sePulse{50%{transform:scale(.55);opacity:.5}}
.se h2{text-wrap:balance;margin:0 0 10px;font:700 clamp(34px,6vw,46px)/1.2 "Amiri","Noto Naskh Arabic",Georgia,serif;color:#fff;text-shadow:0 0 22px hsl(var(--h,262) calc(70% * var(--k,1)) 55%/.55)}
.se p{text-wrap:balance;margin:0 auto 24px;max-width:40ch;font:500 clamp(16px,2.5vw,19px)/1.95 "Cairo",sans-serif;color:#dbe3ec;white-space:pre-line;overflow-wrap:anywhere}
.se-btn{width:100%;height:54px;border:0;border-radius:14px;cursor:pointer;font:800 1.02rem "Cairo",sans-serif;color:var(--btn-ink,#fff);
 background:linear-gradient(135deg,var(--glow-color,hsl(var(--h,262) 80% 57%)),var(--glow-color-dark,hsl(var(--h,262) 75% 43%)));box-shadow:0 12px 30px hsl(var(--h,262) calc(60% * var(--k,1)) 40%/.4),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .15s,filter .2s}
.se-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}.se-btn:active{transform:scale(.985)}
.se-note{display:block;margin-top:14px;min-height:1.2em;color:#8e98a4;font-size:.8rem}
@media (prefers-reduced-motion:reduce){.se,.se-card,.se-ring .fg{transition:none}.se-badge i{animation:none}}`;
let el,timer;
function ensure(){if(document.getElementById('seStyle'))return;const s=document.createElement('style');s.id='seStyle';s.textContent=CSS;document.head.appendChild(s);
  if(!document.querySelector('link[href*="family=Amiri"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&display=swap';document.head.appendChild(l);}}
function hide(){clearInterval(timer);if(!el)return;const e=el;el=null;e.classList.remove('show');setTimeout(()=>e.remove(),350);document.removeEventListener('keydown',onKey);}
function onKey(e){if(e.key==='Escape'&&el&&el.dataset.preview==='1')hide();}
function show(o){o=o||{};ensure();hide();const total=Math.max(1,+o.seconds||6),url=o.loginUrl||'index.html';
  el=document.createElement('div');el.id='sessionEnded';el.className='se';el.dataset.preview=o.preview?'1':'0';el.setAttribute('role','alertdialog');el.setAttribute('aria-live','assertive');
  el.innerHTML='<div class="se-card"><div class="se-ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52"/></svg><b class="se-n"></b></div>'+
    '<span class="se-badge"><i></i><span>تحديث الموقع</span></span><h2></h2><p></p><button type="button" class="se-btn"></button><small class="se-note"></small></div>';
  el.querySelector('h2').textContent=o.title||'انتهت الجلسة';
  el.querySelector('p').textContent=o.message||'بنحدّث الموقع دلوقتي، وهنحوّلك لصفحة تسجيل الدخول بعد لحظات.';
  el.querySelector('.se-btn').textContent=o.buttonText||'تسجيل الدخول الآن';
  if(o.badge)el.querySelector('.se-badge span').textContent=o.badge;
  if(o.manual)el.querySelector('.se-ring').style.display='none';
  const n=el.querySelector('.se-n'),fg=el.querySelector('.fg'),note=el.querySelector('.se-note');let left=total;n.textContent=left;
  const go=()=>{clearInterval(timer);o.onDone&&o.onDone();if(o.preview){note.textContent='معاينة فقط — في الوضع الحقيقي كان هيحوّل لصفحة الدخول دلوقتي';n.textContent='✓';}else location.replace(url);};
  el.querySelector('.se-btn').onclick=go;
  if(o.preview)el.addEventListener('click',e=>{if(e.target===el)hide();});
  document.addEventListener('keydown',onKey);document.body.appendChild(el);requestAnimationFrame(()=>requestAnimationFrame(()=>el&&el.classList.add('show')));
  if(!o.manual)timer=setInterval(()=>{left--;n.textContent=Math.max(left,0);fg.style.strokeDashoffset=(326.7*(1-left/total)).toFixed(1);if(left<=0)go();},1000);
  if(window.__lamp&&__lamp.maint)__lamp.maint(true,'انتهت الجلسة… بنحدّث الموقع 🛠️');}
window.SessionEnded={show,hide};
})();
