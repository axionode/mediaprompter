'use strict';
const $ = id => document.getElementById(id);
const core = window.PrompterCore;
const icons = {
  play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
  expand:'<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  edit:'<path d="m15 5 4 4M4 20l5-1L20 8a3 3 0 0 0-4-4L5 15z"/>',
  wifi:'<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".5"/>',
  screen:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  move:'<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  rotate:'<path d="M20 8a8 8 0 1 0 0 9M20 3v5h-5"/>',
  external:'<path d="M13 4h7v7m0-7-9 9M9 4H4v16h16v-5"/>',
  reset:'<path d="M4 4v6h6M4 10a8 8 0 1 1 0 6"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>'
};
function icon(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (icons[name] || icons.screen) + '</svg>'; }
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const state = {
  text:'', playing:false, speed:40, selected:'text', clean:false, layout:'free', userLayout:false, revision:0,
  settings:{fontFamily:'Segoe UI',fontSize:42,lineHeight:1.4,fontWeight:600,textAlign:'left',padding:12,textColor:'#f4f2ed',textBackground:'#0c0e11',mirrorText:false,readingGuide:false},
  video:{rotation:0,flipX:false,flipY:false,zoom:1,visible:true},
  rects:{}, receiver:{state:'off'}
};
const view=$('readingViewport'), content=$('readingText'), stage=$('stage');
let bounds, drag, toastTimer, lastFrame, lastPublish=0, savedFocusRect;
let isFullscreen=false;window.studio?.onFullscreen(value=>isFullscreen=value);
let scrollPosition=0;
let retainedAnchor={offset:0,delta:0}, pendingAnchor=null;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function selectPanel(name){state.selected=name;document.querySelectorAll('[data-panel]').forEach(p=>p.classList.toggle('selected',p.dataset.panel===name));$('selectedPanel').value=name;syncRectInputs();}
function syncRectInputs(){const r=state.rects[state.selected];if(!r)return;for(const key of ['x','y','w','h'])$('rect'+key.toUpperCase()).value=Math.round(r[key]);}
function currentAnchor(){return state.text?Reading.anchor(view,content):{offset:0,delta:0};}
function publish(force=false){const now=performance.now();if(!force&&now-lastPublish<180)return;lastPublish=now;retainedAnchor=currentAnchor();window.studio?.updateSession({text:state.text,settings:state.settings,playing:state.playing,speed:state.speed,anchor:retainedAnchor,revision:state.revision});}
function paintRects(anchor){
  for(const name of ['text','video']){const r=state.rects[name];if(!r)continue;Object.assign($(name+'Panel').style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',zIndex:name==='video'?'5':'2'});}
  if(anchor)Reading.restore(view,content,anchor);
  scrollPosition=view.scrollTop;syncRectInputs();fitImage();publish();
}
function newBounds(){
  const next={w:stage.clientWidth,h:stage.clientHeight};if(!next.w||!next.h)return;
  const anchor=pendingAnchor||currentAnchor();pendingAnchor=null;
  if(!bounds||!state.userLayout){bounds=next;state.rects.text=core.constrainRect({x:next.w*.37,y:30,w:next.w*.60,h:next.h-60},next);state.rects.video=core.constrainRect({x:20,y:next.h-Math.min(226,next.h*.34)-20,w:Math.min(310,next.w*.32),h:Math.min(226,next.h*.34)},next);}
  else {for(const name of ['text','video']){const r=state.rects[name];state.rects[name]=core.constrainRect({x:r.x*next.w/bounds.w,y:r.y*next.h/bounds.h,w:r.w*next.w/bounds.w,h:r.h*next.h/bounds.h},next);}bounds=next;}
  paintRects(anchor);
}
new ResizeObserver(newBounds).observe(stage);
function changeSettings(patch){const anchor=currentAnchor();Object.assign(state.settings,patch);Reading.style(content,state.settings);$('textPanel').style.background=state.settings.textBackground;$('guide').hidden=!state.settings.readingGuide;Reading.restore(view,content,anchor);scrollPosition=view.scrollTop;publish(true);}
function updateText(text){const anchor=currentAnchor();state.text=core.normalizeText(text);state.revision++;Reading.render(content,state.text);Reading.style(content,state.settings);$('textEmpty').hidden=Boolean(state.text.trim());$('documentStats').textContent=state.text.trim()?wordCount(state.text)+' слов · '+state.text.length.toLocaleString('ru-RU')+' знаков':'Текст ещё не добавлен';Reading.restore(view,content,anchor);scrollPosition=view.scrollTop;publish(true);}
function wordCount(text){return(text.trim().match(/\S+/g)||[]).length;}
function play(value){
  if(value&&!state.text.trim()){openEditor();return;}
  if(value&&view.scrollHeight-view.clientHeight<2){toast('Весь текст уже помещается. Уменьшите панель или увеличьте шрифт.');return;}
  if(value&&view.scrollTop>=view.scrollHeight-view.clientHeight-1)view.scrollTop=0;
  state.playing=value;scrollPosition=view.scrollTop;lastFrame=undefined;
  $('playPause').innerHTML='<b>'+icon(value?'pause':'play')+'</b><span>'+(value?'Пауза':'Читать')+'</span>';
  $('cleanPlay').textContent=value?'Ⅱ':'▶';publish(true);
}
function frame(time){
  if(state.playing){const elapsed=lastFrame===undefined?0:(time-lastFrame)/1000;const max=Math.max(0,view.scrollHeight-view.clientHeight);scrollPosition=core.scrollStep(scrollPosition,state.speed,elapsed,max);view.scrollTop=scrollPosition;if(view.scrollTop>=max-1){play(false);toast('Конец текста');}publish();}
  lastFrame=time;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
view.addEventListener('scroll',()=>{if(!state.playing)scrollPosition=view.scrollTop;retainedAnchor=currentAnchor();publish();},{passive:true});
view.addEventListener('wheel',()=>{if(state.playing)play(false);},{passive:true});
function setSpeed(value){state.speed=core.clamp(Number(value)||5,5,180);$('speed').value=state.speed;$('speedNumber').value=state.speed;publish(true);}
$('speed').addEventListener('input',e=>setSpeed(e.target.value));$('speedNumber').addEventListener('change',e=>setSpeed(e.target.value));
$('playPause').onclick=() =>play(!state.playing);$('cleanPlay').onclick=()=>play(!state.playing);$('toStart').onclick=()=>{view.scrollTop=0;publish(true);};
function openEditor(){play(false);$('editor').value=state.text;$('editorStats').textContent=wordCount(state.text)+' слов';$('editorDialog').showModal();$('editor').focus();}
function closeEditor(){$('editorDialog').close();$('editor').value='';}
for(const id of ['editText','editInPanel','emptyEdit'])$(id).onclick=openEditor;
for(const id of ['cancelEditor','cancelEditorTop'])$(id).onclick=closeEditor;
$('editorDialog').addEventListener('cancel',()=>{$('editor').value='';});
$('editor').addEventListener('input',()=>{$('editorStats').textContent=wordCount($('editor').value)+' слов';});
function applyEditor(){updateText($('editor').value);closeEditor();}
$('applyEditor').onclick=applyEditor;
$('editor').addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();applyEditor();}});
$('pasteClipboard').onclick=async()=>{try{const text=await window.studio.readClipboard();const editor=$('editor');editor.setRangeText(core.normalizeText(text),editor.selectionStart,editor.selectionEnd,'end');editor.dispatchEvent(new Event('input'));editor.focus();}catch{toast('Используйте Ctrl+V для вставки текста.');}};
for(const id of ['fontFamily','lineHeight','fontWeight','textColor'])$(id).addEventListener('input',e=>changeSettings({[id]:['lineHeight','fontWeight'].includes(id)?+e.target.value:e.target.value}));
$('textBackground').addEventListener('input',e=>changeSettings({textBackground:e.target.value}));
function setFont(value){const size=core.clamp(+value||16,16,120);$('fontSize').value=size;$('fontSizeNumber').value=size;changeSettings({fontSize:size});}
$('fontSize').addEventListener('input',e=>setFont(e.target.value));$('fontSizeNumber').addEventListener('change',e=>setFont(e.target.value));
function setPadding(value){const padding=core.clamp(+value||0,0,80);$('padding').value=padding;$('paddingValue').value=padding;changeSettings({padding});}
$('padding').addEventListener('input',e=>setPadding(e.target.value));$('zeroPadding').onclick=()=>setPadding(0);
for(const id of ['mirrorText','readingGuide'])$(id).onchange=e=>changeSettings({[id]:e.target.checked});
function segmented(id,value){$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.value===String(value)));}
$('textAlign').onclick=e=>{const button=e.target.closest('[data-value]');if(button){segmented('textAlign',button.dataset.value);changeSettings({textAlign:button.dataset.value});}};
function videoChange(patch){Object.assign(state.video,patch);segmented('rotation',state.video.rotation);$('flipX').checked=state.video.flipX;$('flipY').checked=state.video.flipY;$('zoom').value=state.video.zoom*100;$('zoomValue').value=Math.round(state.video.zoom*100);$('showVideo').checked=state.video.visible;$('videoPanel').hidden=!state.video.visible;fitImage();}
function fitImage(){const image=$('cameraImage');if(!image.naturalWidth)return;const viewport=$('videoViewport');const size=core.fitVideo(image.naturalWidth,image.naturalHeight,viewport.clientWidth,viewport.clientHeight,state.video.rotation,state.video.zoom);image.style.width=size.width+'px';image.style.height=size.height+'px';image.style.transform='rotate('+state.video.rotation+'deg) scale('+(state.video.flipX?-1:1)+','+(state.video.flipY?-1:1)+')';}
$('cameraImage').onload=fitImage;setInterval(fitImage,700);
$('rotation').onclick=e=>{const b=e.target.closest('[data-value]');if(b)videoChange({rotation:+b.dataset.value});};
$('quickRotate').onclick=()=>videoChange({rotation:(state.video.rotation+90)%360});
for(const id of ['flipX','flipY'])$(id).onchange=e=>videoChange({[id]:e.target.checked});
$('zoom').oninput=e=>videoChange({zoom:+e.target.value/100});$('showVideo').onchange=e=>videoChange({visible:e.target.checked});
$('resetVideo').onclick=()=>videoChange({rotation:0,flipX:false,flipY:false,zoom:1});
function focusVideo(){if(savedFocusRect){state.rects.video=savedFocusRect;savedFocusRect=null;}else{savedFocusRect={...state.rects.video};state.rects.video=core.constrainRect({x:bounds.w*.05,y:bounds.h*.05,w:bounds.w*.9,h:bounds.h*.9},bounds);}paintRects();}
$('videoFocus').onclick=focusVideo;$('videoViewport').addEventListener('dblclick',focusVideo);
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('[data-section]').forEach(s=>s.hidden=s.dataset.section!==name);}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('selectedPanel').onchange=e=>selectPanel(e.target.value);
for(const name of ['text','video']){
  const panel=$(name+'Panel');
  for(const edge of ['n','s','e','w','nw','ne','sw','se']){const handle=document.createElement('div');handle.className='resize-handle';handle.dataset.edge=edge;panel.append(handle);}
  panel.addEventListener('pointerdown',e=>{
    if(e.button!==0||state.clean||e.target.closest('button,input,select,textarea'))return;
    selectPanel(name);
    const edge=e.target.closest('[data-edge]')?.dataset.edge;
    if(!edge&&!e.target.closest('[data-drag]')&&!e.altKey)return;
    e.preventDefault();panel.setPointerCapture(e.pointerId);
    state.userLayout=true;drag={name,edge,x:e.clientX,y:e.clientY,rect:{...state.rects[name]},anchor:currentAnchor(),pointerId:e.pointerId};
  });
  panel.addEventListener('pointermove',e=>{
    if(!drag||drag.name!==name)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    let r=drag.edge?core.resizeRect(drag.rect,drag.edge,dx,dy,bounds):core.constrainRect({...drag.rect,x:drag.rect.x+dx,y:drag.rect.y+dy},bounds);
    const centerX=Math.abs(r.x+r.w/2-bounds.w/2)<6,centerY=Math.abs(r.y+r.h/2-bounds.h/2)<6;
    if(!drag.edge){if(centerX)r.x=(bounds.w-r.w)/2;if(centerY)r.y=(bounds.h-r.h)/2;}
    $('alignGuideX').hidden=!centerX;$('alignGuideY').hidden=!centerY;
    state.rects[name]=r;state.layout='free';paintRects(drag.anchor);
  });
  const stopDrag=()=>{if(drag?.name===name){drag=null;$('alignGuideX').hidden=true;$('alignGuideY').hidden=true;publish(true);}};
  panel.addEventListener('pointerup',stopDrag);panel.addEventListener('lostpointercapture',stopDrag);panel.addEventListener('pointercancel',stopDrag);
}
for(const key of ['x','y','w','h'])$('rect'+key.toUpperCase()).onchange=e=>{const anchor=currentAnchor();state.userLayout=true;state.rects[state.selected]=core.constrainRect({...state.rects[state.selected],[key]:+e.target.value},bounds);paintRects(anchor);};
document.querySelectorAll('[data-snap]').forEach(b=>b.onclick=()=>{state.userLayout=true;const r=state.rects[state.selected];const dir=b.dataset.snap;if(dir==='left')r.x=0;if(dir==='right')r.x=bounds.w-r.w;if(dir==='center')r.x=(bounds.w-r.w)/2;if(dir==='top')r.y=0;if(dir==='bottom')r.y=bounds.h-r.h;paintRects();});
function layout(name){
 const anchor=currentAnchor();state.userLayout=true;state.layout=name;savedFocusRect=null;
 if(name==='side'){state.rects.video={x:0,y:0,w:bounds.w*.35-7,h:bounds.h};state.rects.text={x:bounds.w*.35+7,y:0,w:bounds.w*.65-7,h:bounds.h};}
 if(name==='bottom'||name==='text'){state.rects.text={x:0,y:0,w:bounds.w,h:bounds.h};state.rects.video={x:12,y:bounds.h*.66-12,w:bounds.w*.28,h:bounds.h*.34};}
 if(name!=='free')videoChange({visible:name!=='text'});
 for(const n of ['text','video'])state.rects[n]=core.constrainRect(state.rects[n],bounds);
 document.querySelectorAll('[data-layout]').forEach(b=>b.classList.toggle('active',b.dataset.layout===name));paintRects(anchor);
}
document.querySelectorAll('[data-layout]').forEach(b=>b.onclick=()=>layout(b.dataset.layout));
function inspector(show){pendingAnchor=currentAnchor();document.body.classList.toggle('inspector-collapsed',!show);$('reopenInspector').hidden=show;}
$('collapseInspector').onclick=()=>inspector(false);$('reopenInspector').onclick=()=>inspector(true);
function clean(value){pendingAnchor=currentAnchor();state.clean=value;document.body.classList.toggle('clean',value);}
$('cleanMode').onclick=()=>clean(true);$('exitClean').onclick=()=>clean(false);
function fullscreen(){window.studio?.toggleFullscreen().then(value=>isFullscreen=value);}
$('fullscreen').onclick=fullscreen;$('cleanFullscreen').onclick=fullscreen;
for(const id of ['detachText','detachInPanel'])$(id).onclick=()=>{publish(true);window.studio?.detachText();};
function connection(status){
 const wasLive=state.receiver?.state==='connected';
 state.receiver=status;
 if($('videoQuality'))$('videoQuality').value=status.quality||'detail';
 $('streamMetrics').textContent=status.width&&status.height?status.width+' × '+status.height+(status.fps?' · '+status.fps+' кадр/с':''):'Кадры пока не поступают';
 const active=['starting','ready','connected'].includes(status.state),live=status.state==='connected';
 $('toggleAirplay').classList.toggle('active',active);$('airplayButtonLabel').textContent=live?'iPhone подключён':active?'AirPlay включён':'Подключить iPhone';
 $('pinCode').textContent=status.pin||'— — — —';$('receiverMessage').textContent=status.message||'';
 $('connectionStatus').textContent=live?'iPhone · изображение поступает':status.state==='ready'?'AirPlay · ожидаем iPhone':status.state==='starting'?'AirPlay · запуск…':status.state==='error'?'Ошибка AirPlay':'AirPlay выключен';
 $('connectionDot').className='dot '+(live?'green':status.state==='error'?'red':active?'orange':'');
 $('videoBadge').classList.toggle('live',live);$('videoBadgeText').textContent=live?'AIRPLAY · ВИДЕО':active?'ОЖИДАЕМ IPHONE':'НЕТ ПОДКЛЮЧЕНИЯ';
 $('videoBadge').querySelector('.dot').className='dot '+(live?'green':'');
 if(status.streamUrl&&$('cameraImage').getAttribute('src')!==status.streamUrl)$('cameraImage').src=status.streamUrl;
 $('cameraImage').hidden=!live;$('videoEmpty').hidden=live;
 $('connectInPanel').textContent=active?'Показать код':'Включить AirPlay';
 if(status.state==='error'){toast(status.message||'Не удалось запустить AirPlay');$('connectionCard').hidden=false;}
 if(live&&!wasLive)$('connectionCard').hidden=true;
}
async function toggleReceiver(){if(!window.studio){toast('Для AirPlay запустите приложение через Start.cmd.');return;}if(['starting','ready','connected'].includes(state.receiver.state)){$('connectionCard').hidden=!$('connectionCard').hidden;return;}$('connectionCard').hidden=false;connection(await window.studio.toggleReceiver());}
$('videoQuality').onchange=async e=>{if(window.studio){const result=await window.studio.setQuality(e.target.value);if(result.needsReconnect)toast('Выключите AirPlay и подключите iPhone заново, чтобы применить режим.');}};
$('toggleAirplay').onclick=toggleReceiver;$('connectInPanel').onclick=toggleReceiver;
$('stopAirplay').onclick=async()=>{connection(await window.studio.toggleReceiver());$('connectionCard').hidden=true;};
$('closeConnectionCard').onclick=()=>{$('connectionCard').hidden=true;};
window.studio?.onReceiverStatus(connection);window.studio?.receiverStatus().then(connection);
function command(value){if(value==='pause')play(false);if(value?.type==='seek'){play(false);Reading.restore(view,content,value.anchor);publish(true);}if(value==='toggle-play')play(!state.playing);if(value==='start'){view.scrollTop=0;publish(true);}}
window.studio?.onCommand(command);
document.addEventListener('keydown',e=>{
 if(e.key==='F11'){e.preventDefault();fullscreen();return;}
 if($('editorDialog').open)return;
 if(e.key==='Escape'){if(state.clean){clean(false);e.preventDefault();}if(isFullscreen){fullscreen();e.preventDefault();}return;}
 if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;
 if(e.code==='Space'){e.preventDefault();play(!state.playing);}
 if(e.key==='Home'){e.preventDefault();view.scrollTop=0;publish(true);}
 if(e.key==='ArrowUp'){e.preventDefault();setSpeed(state.speed-5);}
 if(e.key==='ArrowDown'){e.preventDefault();setSpeed(state.speed+5);}
 if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();view.scrollTop+=(e.key==='PageDown'?1:-1)*view.clientHeight*.7;publish(true);}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='e'){e.preventDefault();openEditor();}
});
document.addEventListener('visibilitychange',()=>{lastFrame=undefined;});
window.addEventListener('beforeunload',()=>{state.text='';$('editor').value='';content.replaceChildren();});
changeSettings({});newBounds();publish(true);
