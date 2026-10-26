'use strict';
const view=document.getElementById('popoutView'),content=document.getElementById('popoutText');
let isFullscreen=false;
window.studio.onFullscreen(value=>isFullscreen=value);
let current,programmaticUntil=0,scrollTimer,pinned=true;
function update(value){
 if(!value)return;
 const changed=!current||current.text!==value.text;
 const appearance=!current||JSON.stringify(current.settings)!==JSON.stringify(value.settings);
 current=value;
 if(changed)Reading.render(content,current.text);
 if(appearance)Reading.style(content,current.settings);
 document.body.style.background=current.settings.textBackground;
 document.getElementById('popoutGuide').hidden=!current.settings.readingGuide;
 document.getElementById('popoutEmpty').hidden=Boolean(current.text.trim());
 document.getElementById('popoutPlay').textContent=current.playing?'Пауза':'Читать';
 programmaticUntil=performance.now()+100;
 Reading.restore(view,content,current.anchor);
}
window.studio.onSession(update);window.studio.getSession().then(update);
new ResizeObserver(()=>{if(current){programmaticUntil=performance.now()+100;Reading.restore(view,content,current.anchor);}}).observe(view);
view.addEventListener('wheel',()=>{window.studio.command('pause');programmaticUntil=0;},{passive:true});
view.addEventListener('scroll',()=>{if(performance.now()<programmaticUntil)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>window.studio.command({type:'seek',anchor:Reading.anchor(view,content)}),70);},{passive:true});
document.getElementById('popoutPlay').onclick=()=>window.studio.command('toggle-play');
document.getElementById('popoutFullscreen').onclick=()=>window.studio.toggleFullscreen();
document.getElementById('popoutTop').onclick=()=>{pinned=!pinned;window.studio.setAlwaysOnTop(pinned);document.getElementById('popoutTop').textContent=pinned?'Закреплено':'Закрепить';};
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();window.studio.command('toggle-play');}if(e.key==='Escape'&&isFullscreen){e.preventDefault();window.studio.toggleFullscreen().then(value=>isFullscreen=value);}if(e.key==='Home'){e.preventDefault();window.studio.command('start');}if(e.key==='F11'){e.preventDefault();window.studio.toggleFullscreen().then(value=>isFullscreen=value);}});
window.addEventListener('beforeunload',()=>{current=null;content.replaceChildren();});
