(()=>{
'use strict';

const VERSION='standard-v1-2026-09';
const STORAGE_KEY=`82trade-trader-dna:${VERSION}`;
const view=document.querySelector('#view');
let queued=false;
let sawReveal=false;
let silenceTimer=0;
let lockOccluder=null;
let lockOccluderTimer=0;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

function armLockCut(event){
  if(reducedMotion()||lockOccluder)return;
  const option=event.target?.closest?.('.option');
  const wrap=option?.closest?.('.quiz-wrap');
  if(!option||!wrap||option.disabled||wrap.dataset.v4Act!=='pressure')return;
  if(wrap.querySelector('.question-index')?.textContent?.trim()!=='Q12')return;
  const app=document.querySelector('.app');
  if(!app)return;
  lockOccluder=document.createElement('div');
  lockOccluder.className='v48-lock-occluder';
  lockOccluder.dataset.phase='armed';
  lockOccluder.setAttribute('aria-hidden','true');
  app.appendChild(lockOccluder);
  requestAnimationFrame(()=>{if(lockOccluder?.isConnected)lockOccluder.dataset.phase='cover'});
}
function releaseLockCut(){
  const node=lockOccluder;
  if(!node?.isConnected)return;
  clearTimeout(lockOccluderTimer);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!node.isConnected)return;
    node.dataset.phase='reveal';
    lockOccluderTimer=setTimeout(()=>{
      node.remove();
      if(lockOccluder===node)lockOccluder=null;
    },220);
  }));
}

function state(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
}
function choices18(){
  const answers=state()?.answers||{};
  return Array.from({length:18},(_,i)=>answers[i+1]||null);
}
function answeredCount(choices){return choices.filter(Boolean).length}
function choiceSignature(choices){return choices.map(choice=>choice||'-').join('')}
function actForQuestion(qNum){return qNum<=6?'exposure':qNum<=12?'pressure':'lock'}
function smoothPath(points){
  if(!points.length)return '';
  if(points.length===1)return `M ${points[0].x} ${points[0].y}`;
  let d=`M ${points[0].x} ${points[0].y}`;
  for(let i=1;i<points.length;i++){
    const prev=points[i-1],p=points[i];
    const mx=(prev.x+p.x)/2;
    d+=` C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }
  return d;
}

/*
  Canonical spine: deliberately calmer than the visible engraving.
  It carries four facts from the answer sequence:
  - cumulative bias across all answered items,
  - recent momentum,
  - a small question-position microtexture,
  - accumulated directional pressure that becomes legible only as a choice pattern persists.
  A/B does not simply map to two y-levels, so the object cannot collapse into an ECG chart.
*/
function decisionPoints(choices){
  let balance=0,momentum=0;
  return Array.from({length:18},(_,i)=>{
    const choice=choices[i]||null;
    const x=30+i*(940/17);
    if(!choice)return {x:Number(x.toFixed(2)),y:110,choice:null};
    const direction=choice==='A'?-1:1;
    balance+=direction;
    momentum=momentum*.58+direction;
    const history=Math.tanh(balance/3.6)*21;
    const recent=momentum*5.8;
    const texture=Math.sin((i+1)*1.19)*2.8+Math.cos((i+1)*.61)*1.8;
    const progress=i/17;
    const pressure=Math.tanh(balance/5.2)*progress*4;
    const y=110+history+recent+texture+pressure;
    return {x:Number(x.toFixed(2)),y:Number(y.toFixed(2)),choice};
  });
}

/*
  Issued-trace braid: answer order advances and reverses phase, so two users
  with the same A/B total still receive different engraved geometry.
  The canonical spine remains stable while the filaments create material depth.
*/
function threadPath(points,choices,strand){
  let phase=strand*.73;
  const threaded=points.map((p,i)=>{
    const choice=choices[i]||'A';
    const direction=choice==='A'?-1:1;
    phase+=.61+direction*(.17+(i%5)*.027);
    const amp=5.2+Math.abs(strand)*1.28+(i%4)*.34;
    const crossing=Math.sin(phase+strand*.67)*amp;
    const interference=Math.cos(phase*.53-strand*.91)*2.5;
    const bias=strand*1.05;
    return {x:p.x,y:Number((p.y+crossing+interference+bias).toFixed(2))};
  });
  return smoothPath(threaded);
}
function pointFor(choice,index){
  const seed=Array(18).fill(null);seed[index]=choice;
  return decisionPoints(seed)[index];
}
function weaveMarkup(choices,{mode='live'}={}){
  const points=decisionPoints(choices);
  const count=answeredCount(choices);
  const stateName=count===0?'unissued':count===18?'sealed':'forming';
  const committed=points.slice(0,count);
  const committedChoices=choices.slice(0,count);
  const d=smoothPath(committed);
  const strandIds=[-4,-3,-2,-1,1,2,3,4];
  const threads=d?strandIds.map((strand,i)=>`<path class="v4-weave-thread t-${i+1}" d="${threadPath(committed,committedChoices,strand)}"></path>`).join(''):'';
  const nodes=choices.map((choice,i)=>{
    const p=points[i];
    const cls=choice?`is-${choice.toLowerCase()} is-committed`:'is-open';
    return `<g class="v4-node ${cls}" transform="translate(${p.x} ${p.y})"><line y1="-8" y2="8"></line><circle r="${choice?3.8:2.2}"></circle></g>`;
  }).join('');
  const anchors=Array.from({length:18},(_,i)=>{
    const x=30+i*(940/17);
    return `<line class="v4-register v4-register-top" x1="${x}" y1="78" x2="${x}" y2="86"></line><line class="v4-register v4-register-bottom" x1="${x}" y1="134" x2="${x}" y2="142"></line>`;
  }).join('');
  const plateMarks=`<path class="v4-plate-mark" d="M 18 72 H 42 M 18 72 V 94 M 982 72 H 958 M 982 72 V 94 M 18 148 H 42 M 18 148 V 126 M 982 148 H 958 M 982 148 V 126"></path>`;
  return `<svg class="v4-weave" data-mode="${mode}" data-state="${stateName}" data-committed="${count}" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
    <line class="v4-axis" x1="30" y1="110" x2="970" y2="110"></line>
    ${anchors}
    ${plateMarks}
    <path class="v4-weave-ghost" d="M 30 110 H 970"></path>
    ${threads}
    ${d?`<path class="v4-weave-shadow" d="${d}"></path><path class="v4-weave-path" pathLength="1" d="${d}"></path>`:''}
    ${nodes}
  </svg>`;
}
function mountLanding(){
  const material=view?.querySelector('.v3-hero-material');
  if(!material||material.querySelector('.v4-landing-specimen'))return;
  const wrap=document.createElement('div');
  wrap.className='v4-landing-specimen';
  wrap.innerHTML=`<div class="v4-specimen-meta"><span>UNISSUED / 18 DECISIONS</span><b>IDENTITY PLATE</b></div>${weaveMarkup(Array(18).fill(null),{mode:'landing'})}`;
  material.appendChild(wrap);
}
function isScan01(s){return s?.mode==='quick'||(s?.mode==='full'&&Number(s?.index||0)<18)}
function mountQuiz(){
  const wrap=view?.querySelector('.quiz-wrap');
  const s=state();
  if(!wrap||!isScan01(s))return;
  const qText=wrap.querySelector('.question-index')?.textContent?.trim()||'';
  const qNum=Number(qText.replace(/\D/g,''))||Math.min(18,Number(s?.index||0)+1);
  const choices=choices18();
  const count=answeredCount(choices);
  const act=actForQuestion(qNum);
  const sig=`${qNum}:${choiceSignature(choices)}`;
  wrap.dataset.v4Act=act;
  view.dataset.v4Act=act;
  document.querySelector('.app')?.setAttribute('data-v4-act',act);
  wrap.style.setProperty('--v4-q-progress',String(Math.max(0,Math.min(1,(qNum-1)/17))));
  let panel=wrap.querySelector('.v4-weave-panel');
  if(!panel){
    panel=document.createElement('div');panel.className='v4-weave-panel';
    const old=wrap.querySelector('.v3-process-rail');
    if(old)old.insertAdjacentElement('afterend',panel); else wrap.prepend(panel);
  }
  if(panel.dataset.sig===sig)return;
  panel.dataset.q=String(qNum).padStart(2,'0');
  panel.dataset.act=act;
  panel.dataset.sig=sig;
  panel.innerHTML=`<div class="v4-weave-head"><span>IDENTITY PLATE / SCAN 01</span><b>${String(count).padStart(2,'0')} / 18 · ${count===18?'SEALED':'FORMING'}</b></div>${weaveMarkup(choices,{mode:'live'})}`;
  if(qNum===13&&act==='lock')releaseLockCut();
}
function mountReveal(){
  const stage=view?.querySelector('.v3-reveal-stage');
  if(!stage||stage.querySelector('.v4-reveal-source'))return;
  const choices=choices18();
  if(answeredCount(choices)!==18)return;
  sawReveal=true;
  const source=document.createElement('div');source.className='v4-reveal-source';
  source.dataset.sig=choiceSignature(choices);
  source.innerHTML=`<div class="v4-reveal-source-meta">PLATE LOCK / 18 DECISIONS</div>${weaveMarkup(choices,{mode:'reveal'})}`;
  stage.prepend(source);

  clearTimeout(silenceTimer);
  const reveal=stage.closest('.reveal');
  reveal?.removeAttribute('data-v48-silence');
  if(!reducedMotion()){
    silenceTimer=setTimeout(()=>{
      if(reveal?.isConnected&&view?.contains(reveal))reveal.dataset.v48Silence='1';
    },2350);
  }
}
function mountResult(){
  const result=view?.querySelector('.result');
  const hero=result?.querySelector('.result-hero');
  if(!result||!hero||hero.querySelector('.v4-result-mark'))return;
  clearTimeout(silenceTimer);silenceTimer=0;
  const choices=choices18();
  if(answeredCount(choices)!==18)return;
  const mark=document.createElement('div');mark.className='v4-result-mark';
  mark.dataset.sig=choiceSignature(choices);
  const code=hero.querySelector('.code')?.textContent?.trim()||'DNA';
  const identity=hero.querySelector('.identity')?.textContent?.trim()||'TRADER DNA';
  mark.innerHTML=`<div class="v4-result-mark-meta"><span>82TRADE / TRADER DNA</span><b>ISSUED / SCAN 01</b></div>
    <div class="v4-issued-face" aria-hidden="true">
      <span class="v4-issued-dna">DNA</span>
      <div class="v4-issued-id"><b></b><span></span></div>
      <span class="v4-issued-seal">18 / 18 · SEALED</span>
    </div>
    ${weaveMarkup(choices,{mode:'result'})}`;
  mark.querySelector('.v4-issued-id b').textContent=code;
  mark.querySelector('.v4-issued-id span').textContent=identity;
  hero.appendChild(mark);
  /* Fresh Reveal -> Result keeps the authored explicit smooth handoff. Restored Result
     pages cancel that one transition, while the long dossier itself uses auto scrolling
     so WebKit/touch navigation never waits on a multi-screen global smooth scroll. */
  if(!sawReveal)scrollTo({top:0,behavior:'auto'});
}
function cleanupOutsideScan(){
  const s=state();
  if(isScan01(s))return;
  view?.querySelectorAll('.v4-weave-panel').forEach(el=>el.remove());
  view?.removeAttribute('data-v4-act');
  document.querySelector('.app')?.removeAttribute('data-v4-act');
}
function syncScrollPolicy(){
  document.documentElement.style.scrollBehavior=view?.querySelector('.result')?'auto':'';
}
function mount(){
  queued=false;
  mountLanding();mountQuiz();mountReveal();mountResult();cleanupOutsideScan();syncScrollPolicy();
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(mount)}
if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
document.addEventListener('click',armLockCut,true);
addEventListener('storage',schedule);addEventListener('pageshow',schedule);
schedule();

window.TraderDNAV4={choices18,weaveMarkup,pointFor,decisionPoints,threadPath,answeredCount,choiceSignature,actForQuestion};
})();
