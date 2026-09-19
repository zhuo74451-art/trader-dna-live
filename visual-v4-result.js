(()=>{
'use strict';

const view=document.querySelector('#view');
let queued=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

function publishStudio(){
  const studio=view?.querySelector('.v3-share-studio');
  const stage=studio?.querySelector('.v3-share-stage');
  return studio&&stage?{studio,stage}:null;
}
function setPublishState(studio,state){
  if(!studio)return;
  studio.dataset.v48Publish=state;
  const stage=studio.querySelector('.v3-share-stage');
  if(stage)stage.dataset.v48Publish=state;
}
function setPublishButton(studio,state){
  const button=studio?.querySelector('.v3-share-generate');
  if(!button)return;
  if(state==='published'){
    button.innerHTML='身份海報已發佈 <span>✓</span>';
    button.disabled=true;
    button.setAttribute('aria-disabled','true');
  }else if(state==='busy'){
    button.innerHTML='正在發佈 <span>→</span>';
    button.disabled=true;
    button.setAttribute('aria-disabled','true');
  }else{
    button.innerHTML='發佈身份海報 <span>→</span>';
    button.disabled=false;
    button.removeAttribute('aria-disabled');
  }
}
async function runPublish(format='4:5',options={}){
  const nodes=publishStudio();
  if(!nodes)return false;
  const {studio,stage}=nodes;
  if(studio.dataset.v48Publishing==='1')return true;
  const api=window.TraderDNAShareCard;
  if(typeof api?.build!=='function')return false;

  if(studio.dataset.v48Publish==='published'){
    await api.build(format||studio.dataset.format||'4:5');
    if(options.shareAfter&&typeof api.share==='function')await api.share();
    return true;
  }

  studio.dataset.v48Publishing='1';
  setPublishButton(studio,'busy');
  stage.style.setProperty('--v47-rx','0deg');
  stage.style.setProperty('--v47-ry','0deg');
  stage.style.setProperty('--v47-px','0px');
  stage.style.setProperty('--v47-py','0px');

  try{
    await api.build(format||studio.dataset.format||'4:5');
    const img=stage.querySelector('img');
    if(img?.decode)await img.decode().catch(()=>{});

    if(reducedMotion()){
      setPublishState(studio,'published');
    }else{
      setPublishState(studio,'preparing');
      await wait(160);
      setPublishState(studio,'isolated');
      await wait(220);
      setPublishState(studio,'flattening');
      await wait(700);
      setPublishState(studio,'published');
    }

    setPublishButton(studio,'published');
    if(options.shareAfter&&typeof api.share==='function')await api.share();
    return true;
  }finally{
    studio.dataset.v48Publishing='0';
  }
}
function startPublish(format='4:5',options={}){
  const nodes=publishStudio();
  if(!nodes)return false;
  runPublish(format,options).catch(()=>{
    setPublishState(nodes.studio,'issued');
    setPublishButton(nodes.studio,'idle');
  });
  return true;
}
window.TraderDNAPublish={
  start:startPublish,
  isPublished:()=>publishStudio()?.studio.dataset.v48Publish==='published'
};

function signalSummary(result){
  return [...result.querySelectorAll('.v3-signal-card')].slice(0,3).map((card,index)=>({
    no:String(index+1).padStart(2,'0'),
    value:card.querySelector('strong')?.textContent?.trim()||'PROFILE',
    label:card.querySelector('span')?.textContent?.trim()||'SIGNAL'
  }));
}
function bindParallax(stage){
  if(!stage||stage.dataset.v47Bound==='1')return;
  stage.dataset.v47Bound='1';
  const reset=()=>{
    stage.style.setProperty('--v47-rx','0deg');
    stage.style.setProperty('--v47-ry','0deg');
    stage.style.setProperty('--v47-px','0px');
    stage.style.setProperty('--v47-py','0px');
  };
  const move=(event)=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const r=stage.getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(event.clientX-r.left)/Math.max(1,r.width)));
    const y=Math.max(0,Math.min(1,(event.clientY-r.top)/Math.max(1,r.height)));
    stage.style.setProperty('--v47-rx',`${((.5-y)*3.2).toFixed(2)}deg`);
    stage.style.setProperty('--v47-ry',`${((x-.5)*4.4).toFixed(2)}deg`);
    stage.style.setProperty('--v47-px',`${((x-.5)*10).toFixed(2)}px`);
    stage.style.setProperty('--v47-py',`${((y-.5)*8).toFixed(2)}px`);
  };
  stage.addEventListener('pointermove',move,{passive:true});
  stage.addEventListener('pointerleave',reset,{passive:true});
}
function mountLayeredHero(result,issuedPlate){
  const hero=result.querySelector('.result-hero');
  if(!hero||hero.querySelector('.v47-identity-stack'))return;
  const code=hero.querySelector('.code')?.textContent?.trim()||'DNA';
  const identity=hero.querySelector('.identity')?.textContent?.trim()||'TRADER DNA';
  const signals=signalSummary(result);
  const stack=document.createElement('div');
  stack.className='v47-identity-stack';
  stack.setAttribute('aria-hidden','true');
  stack.innerHTML=`
    <div class="v47-identity-back">
      <span>ISSUED IDENTITY / 82TRADE</span>
      <b>${code}</b>
      <em>${identity}</em>
    </div>
    <div class="v47-identity-plate"></div>
    <div class="v47-identity-front">
      <span class="v47-identity-chip">SCAN 01 / SEALED</span>
      <div class="v47-identity-rail">
        ${signals.map(item=>`<div><i>${item.no}</i><b>${item.value}</b><span>${item.label}</span></div>`).join('')}
      </div>
    </div>`;
  hero.appendChild(stack);
  stack.querySelector('.v47-identity-plate').appendChild(issuedPlate);
  bindParallax(stack);
}
function mountLayeredShare(result){
  const stage=result.querySelector('.v3-share-stage');
  const studio=stage?.closest('.v3-share-studio');
  if(!stage||!studio)return;
  if(!stage.querySelector('.v47-share-back')){
    stage.insertAdjacentHTML('afterbegin',`
      <div class="v47-share-back" aria-hidden="true"><span>PUBLIC IDENTITY</span><b>TRADER DNA</b></div>
      <div class="v47-share-front" aria-hidden="true"><span>ISSUED / SHARE ARTIFACT</span></div>`);
  }
  if(!studio.dataset.v48Publish){
    setPublishState(studio,'issued');
    setPublishButton(studio,'idle');
  }
  bindParallax(stage);
}

function ensureFolio(section,no,label){
  if(!section)return;
  section.classList.add('v4-issue-section');
  section.dataset.v4Folio=`${no} / ${label}`;
  if(section.querySelector(':scope > .v4-folio-tag'))return;
  const tag=document.createElement('div');
  tag.className='v4-folio-tag';
  tag.setAttribute('aria-hidden','true');
  tag.innerHTML=`<b>${no}</b><span>${label}</span>`;
  section.prepend(tag);
}

function mount(){
  queued=false;
  const result=view?.querySelector('.result');
  if(!result)return;

  const signal=result.querySelector('.v3-signal-strip');
  const scenes=result.querySelector('.v3-decision-scenes');
  const portrait=result.querySelector('.portrait-section');
  const dims=result.querySelector('.dims-section');
  const sameType=[...result.querySelectorAll('.section')].find(section=>section.querySelector('h3')?.textContent?.includes('同型人物'))||null;
  const reminder=result.querySelector('.reminder');
  const share=result.querySelector('.v3-share-studio');
  const issuedPlate=result.querySelector('.v4-result-mark');

  /* V4 is not considered composition-ready until every existing result chapter
     has arrived. V3 refinement mounts these pieces asynchronously after app.js,
     so exposing readiness earlier lets far-down controls drift while mobile
     WebKit is trying to interact with them. This gate changes no data or flow. */
  if(!signal||!scenes||!portrait||!dims||!sameType||!reminder||!share||!issuedPlate){
    result.removeAttribute('data-v4-ready');
    return;
  }

  result.classList.add('v4-issue');
  mountLayeredHero(result,issuedPlate);
  mountLayeredShare(result);

  ensureFolio(signal,'01','PROFILE SIGNALS');
  ensureFolio(scenes,'02','DECISION SCENES');
  ensureFolio(portrait,'03','DECISION PORTRAIT');
  ensureFolio(dims,'04','SIX DIMENSIONS');
  ensureFolio(sameType,'05','SAME-TYPE ARCHIVE');
  ensureFolio(reminder,'06','PRIVATE NOTE');
  ensureFolio(share,'07','ISSUE OUT');
  sameType.classList.add('v4-same-type');

  scenes.querySelectorAll('.v3-scene-card').forEach((card,index)=>{
    card.style.setProperty('--v4-stack-index',String(index));
    card.dataset.v4Case=String(index+1).padStart(2,'0');
  });

  /* The long dossier uses direct scrolling. The authored Q18 -> Result handoff
     requests smooth behavior explicitly in app.js; after the issue is mounted,
     global smooth scrolling would only make far-down touch targets unstable. */
  document.documentElement.style.scrollBehavior='auto';
  result.dataset.v4Ready='1';
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(mount)}
if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
addEventListener('pageshow',schedule);
schedule();
})();
