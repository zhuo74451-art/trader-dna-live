let QUESTIONS=[];
let TYPES={};
const DIMENSIONS={
 structure:{label:'判斷形成',left:'直覺',right:'結構',leftCode:'I',rightCode:'S',prefix:'S'},
 action:{label:'行動閾值',left:'蓄勢',right:'出擊',leftCode:'W',rightCode:'A',prefix:'A'},
 opportunity:{label:'機會取向',left:'守界',right:'捕獵',leftCode:'G',rightCode:'H',prefix:'O'},
 reactivity:{label:'狀態反應',left:'穩態',right:'敏銳',prefix:'R'},
 persistence:{label:'更新閾值',left:'變陣',right:'定見',leftCode:'F',rightCode:'C',prefix:'P'},
 social:{label:'社會證據',left:'獨行',right:'共振',prefix:'C'}
};
const PREFIX_TO_KEY=Object.fromEntries(Object.entries(DIMENSIONS).map(([k,v])=>[v.prefix,k]));
const SCAN_NAMES={1:'第一層輪廓',2:'開始出現噪音',3:'答案開始不再明顯'};
const view=document.querySelector('#view'), statusEl=document.querySelector('#status'), toast=document.querySelector('#toast');
const ASSESSMENT_VERSION='standard-v1-2026-09';
const STORAGE_KEY=`82trade-trader-dna:${ASSESSMENT_VERSION}`;
const DATA_CACHE_KEY=`82trade-trader-dna:canonical-data:${ASSESSMENT_VERSION}`;
const REDUCED_MOTION=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let state={mode:null,index:0,answers:{},startedAt:null,sessionId:null,completed:false,completedRecord:null};

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function setStatus(t){statusEl.textContent=t}
function sigil(code){return `<div class="sigil" aria-hidden="true"><span class="sigil-rule h"></span><span class="sigil-rule v"></span><b class="notranslate" translate="no">${code.slice(0,2)}</b><small class="notranslate" translate="no">${code.slice(2)}</small></div>`}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}}
function clearState(){try{localStorage.removeItem(STORAGE_KEY)}catch{}}
function loadState(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!x||!['quick','full'].includes(x.mode)||!x.answers||typeof x.answers!=='object')return null;return x}catch{return null}}
function newSessionId(){try{return crypto.randomUUID()}catch{return `tdna-${Date.now()}-${Math.random().toString(36).slice(2)}`}}
function reset(){clearState();state={mode:null,index:0,answers:{},startedAt:null,sessionId:null,completed:false,completedRecord:null};renderLanding();scrollTo({top:0,behavior:'smooth'})}

function renderLanding(){
 setStatus('SCAN 01 · READY');
 view.innerHTML=`<section class="hero">
   <div class="hero-main">
     <div class="kicker">82TRADE / TRADER DNA / SCAN 01</div>
     <h1>市場會暴露<br><em>你的另一面</em></h1>
     <p class="hero-copy">18 個選擇，辨認你在判斷、出手與改變主意時，反覆出現的決策輪廓。</p>
     <div class="cta"><button class="btn" id="start">開始 SCAN 01 <span>→</span></button></div>
     <div class="hero-meta"><span>18 QUESTIONS</span><span>≈ 3 MIN</span><span>NO RIGHT ANSWER</span></div>
   </div>
   <div class="hero-object" aria-hidden="true">
     <div class="register-frame">
       <span class="register-no">01</span>
       <div class="register-cross"></div>
       <div class="register-core"><b>DNA</b><small>DECISION PROFILE</small></div>
       <div class="register-coord">82° / 18 / V1</div>
     </div>
     <p>IDENTITY IS NOT WHAT YOU SAY.<br>IT IS WHAT REPEATS UNDER PRESSURE.</p>
   </div>
 </section>`;
 document.querySelector('#start').onclick=()=>start('quick');
}
function start(mode){state={mode,index:0,answers:{},startedAt:new Date().toISOString(),sessionId:newSessionId(),completed:false,completedRecord:null};saveState();renderQuestion()}
function activeQuestions(){return state.mode==='quick'?QUESTIONS.slice(0,18):QUESTIONS}
function renderQuestion(){
 const qs=activeQuestions(), q=qs[state.index], total=qs.length;
 setStatus(`${state.mode==='quick'?'SCAN 01':'STANDARD 54'} · ${String(state.index+1).padStart(2,'0')}/${String(total).padStart(2,'0')}`);
 const pct=(state.index/total)*100;
 view.innerHTML=`<section class="quiz-wrap">
   <div class="meta">
     <div><div class="scan">${state.mode==='quick'?'SCAN 01':'STANDARD FORM'}</div><div class="scan-title">${state.mode==='quick'?'識別你的第一層決策輪廓':SCAN_NAMES[q.scan]}</div></div>
     <div class="count">${String(state.index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
   </div>
   <div class="bar"><i style="width:${pct}%"></i></div>
   <div class="quiz-stage">
     <div class="question-index">Q${String(state.index+1).padStart(2,'0')}</div>
     <h2 class="question">${esc(q.q)}</h2>
     <div class="options">
       <button class="option" data-choice="A"><span class="letter">A</span><span class="opt-text">${esc(q.a)}</span><span class="arrow">→</span></button>
       <button class="option" data-choice="B"><span class="letter">B</span><span class="opt-text">${esc(q.b)}</span><span class="arrow">→</span></button>
     </div>
     <div class="captured" id="captured"></div>
   </div>
 </section>`;
 document.querySelectorAll('.option').forEach(b=>b.onclick=()=>choose(q,b.dataset.choice));
}
function choose(q,choice){
 state.answers[q.id]=choice;state.completed=false;state.completedRecord=null;saveState();
 document.querySelectorAll('.option').forEach(x=>x.disabled=true);
 const b=document.querySelector(`.option[data-choice="${choice}"]`);b.classList.add('selected');
 document.querySelector('#captured').textContent='RESPONSE REGISTERED';
 setTimeout(()=>{
   const completed=state.index+1;
   if(state.mode==='full'&&(completed===18||completed===36)){state.index++;saveState();renderTransition(completed/18)}
   else if(completed>=activeQuestions().length){renderReveal()}
   else{state.index++;saveState();renderQuestion()}
 },REDUCED_MOTION?80:210)
}
function renderTransition(scanNo){
 setStatus(`SCAN 0${scanNo} · REGISTERED`);
 view.innerHTML=`<section class="transition">
   <div class="transition-rule"></div>
   <div class="scan-mark">0${scanNo}</div>
   <div class="kicker">SCAN 0${scanNo} COMPLETE</div>
   <h2>${scanNo===1?'第一層輪廓已經出現。':'噪音進來以後，輪廓還在不在？'}</h2>
   <p>${scanNo===1?'接下來不是重複問同一件事，而是讓相同構念進入更難的場景。':'最後 18 題會把答案放進更強的壓力、衝突與不完整資訊裡。'}</p>
   <div class="cta"><button class="btn" id="continue">繼續 SCAN 0${scanNo+1} <span>→</span></button></div>
 </section>`;
 document.querySelector('#continue').onclick=renderQuestion;
}

function scores(){
 const facet={};
 QUESTIONS.forEach(q=>{const choice=state.answers[q.id];if(!choice)return;const key=q.facet;const dimKey=PREFIX_TO_KEY[key[0]], dim=DIMENSIONS[dimKey];const selectedPole=choice==='A'?q.aPole:q.bPole;const val=selectedPole===dim.right?1:-1;(facet[key]??=[]).push(val)});
 const facetScore={};Object.entries(facet).forEach(([k,a])=>facetScore[k]=a.reduce((x,y)=>x+y,0)/a.length);
 const dimScore={};Object.entries(DIMENSIONS).forEach(([key,dim])=>{const vals=Object.entries(facetScore).filter(([f])=>f[0]===dim.prefix).map(([,v])=>v);dimScore[key]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0});
 return {facetScore,dimScore};
}
function codeFrom(d){return `${d.structure>=0?'S':'I'}${d.action>=0?'A':'W'}${d.opportunity>=0?'H':'G'}${d.persistence>=0?'C':'F'}`}
function dimRow(key,val,color){const d=DIMENSIONS[key],pct=Math.round((val+1)*50),lead=val>=0?d.right:d.left;return `<div class="dim-row"><div class="dim-top"><b>${d.label}</b><span>${d.left} ${100-pct} / ${pct} ${d.right}</span></div><div class="track"><span class="track-mid"></span><i style="width:${pct}%;--tc:${color}"></i></div><div class="dim-lead">${lead}</div></div>`}
function buildAssessmentRecord(dimScore,code){const completedAt=new Date().toISOString(),params=new URLSearchParams(location.search);const started=state.startedAt?Date.parse(state.startedAt):null;return {assessmentVersion:ASSESSMENT_VERSION,sessionId:state.sessionId||newSessionId(),mode:state.mode,questionCount:Object.keys(state.answers).length,answers:{...state.answers},dimensions:{...dimScore},dna:code,startedAt:state.startedAt,completedAt,durationMs:started?Math.max(0,Date.parse(completedAt)-started):null,source:{utm_source:params.get('utm_source'),utm_medium:params.get('utm_medium'),utm_campaign:params.get('utm_campaign')}}}
function renderReveal(){
 const {dimScore}=scores(),code=codeFrom(dimScore),t=TYPES[code];
 const answerList=activeQuestions().map(q=>state.answers[q.id]).filter(Boolean);
 const traces=answerList.map((choice,i)=>`<i class="trace ${choice==='A'?'trace-a':'trace-b'}" style="--i:${i}"></i>`).join('');
 setStatus('IDENTITY · RESOLVING');
 view.innerHTML=`<section class="reveal" style="--tc:${t.color}">
   <div class="reveal-meta"><span>${state.mode==='quick'?'SCAN 01':'STANDARD 54'}</span><span>${answerList.length} RESPONSES REGISTERED</span></div>
   <div class="trace-field">${traces}</div>
   <div class="reveal-lock">
     <div class="reveal-label">DECISION PROFILE RESOLVED</div>
     <div class="reveal-code notranslate" translate="no">${code}</div>
     <div class="reveal-name">${esc(t.name)}</div>
   </div>
 </section>`;
 setTimeout(renderResult,REDUCED_MOTION?350:2750);
}
function renderResult(){
 const {dimScore}=scores(),code=codeFrom(dimScore),t=TYPES[code],wasCompleted=state.completed;
 const record=state.completedRecord||buildAssessmentRecord(dimScore,code);
 state.completed=true;state.completedRecord=record;saveState();
 if(!wasCompleted)document.dispatchEvent(new CustomEvent('traderdna:completed',{detail:record}));
 setStatus(state.mode==='quick'?'SCAN 01 · RESULT':'STANDARD 54 · RESULT');
 const modeLabel=state.mode==='quick'?'SCAN 01 / PRELIMINARY PROFILE':'STANDARD FORM V1 / 54 QUESTIONS';
 view.innerHTML=`<section class="result" style="--tc:${t.color}">
   <article class="result-hero">
     <div class="dossier-head"><span>82TRADE / TRADER DNA</span><span>${modeLabel}</span></div>
     <div class="result-lock">${sigil(code)}</div>
     <div class="result-kicker">YOUR TRADER DNA</div>
     <div class="code notranslate" translate="no">${code}</div>
     <div class="identity">${esc(t.name)}</div>
     <div class="hook">${esc(t.hook)}</div>
     <div class="result-foot"><span>ASSESSMENT ${ASSESSMENT_VERSION}</span><span>SESSION ${esc((state.sessionId||'').slice(0,8).toUpperCase())}</span></div>
   </article>

   <div class="result-grid">
     <section class="section portrait-section"><h3>01 / 決策畫像</h3><div class="portrait">${t.body.map(p=>`<p>${esc(p)}</p>`).join('')}</div></section>
     <section class="section share-preview"><div class="share-brand">82TRADE / TRADER DNA</div><div class="share-code notranslate" translate="no">${code}</div><div class="share-name">${esc(t.name)}</div><p>${esc(t.hook)}</p><div class="share-foot">KNOW YOUR PATTERN.</div></section>
   </div>

   <section class="section dims-section"><h3>02 / 六維連續輪廓</h3><div class="dims">${Object.keys(DIMENSIONS).map(k=>dimRow(k,dimScore[k],t.color)).join('')}</div></section>
   <section class="section"><h3>03 / 同型人物 · 風格映射</h3><div class="people">${t.people.map(p=>`<div class="person">${esc(p)}</div>`).join('')}</div></section>
   <section class="section reminder"><h3>PRIVATE / 只留給你的提醒</h3><p>${esc(t.reminder)}</p></section>
   <div class="actions"><button class="btn" id="copy">複製分享文案 <span>→</span></button>${state.mode==='quick'?'<button class="btn alt" id="full">繼續完整 54 題</button>':''}<button class="btn alt" id="again">重新測</button></div>
   <div class="legal">Trader DNA 用於交易者自我認知、品牌表達與分享傳播。它不等於風險承受能力測評，不直接給買賣、部位、槓桿或策略建議。同型人物是依其公開決策風格做的映射，不代表本人背書。</div>
 </section>`;
 document.querySelector('#again').onclick=reset;
 document.querySelector('#copy').onclick=()=>copyShare(code,t);
 const full=document.querySelector('#full');if(full)full.onclick=continueFull;
 scrollTo({top:0,behavior:REDUCED_MOTION?'auto':'smooth'});
}
function continueFull(){state.mode='full';state.index=18;state.completed=false;state.completedRecord=null;saveState();renderTransition(1)}
async function copyShare(code,t){const txt=`82TRADE 交易 DNA\n${code} · ${t.name}\n\n${t.hook}\n\n${t.body.join('\n\n')}\n\n同型人物：\n${t.people.join('\n')}\n\n#82TRADE #TraderDNA`;try{await navigator.clipboard.writeText(txt);showToast('分享文案已複製')}catch{const ta=document.createElement('textarea');ta.value=txt;document.body.append(ta);ta.select();document.execCommand('copy');ta.remove();showToast('分享文案已複製')}}
function showToast(t){toast.textContent=t;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1400)}
function readCanonicalDataCache(){
  try{
    if(typeof sessionStorage==='undefined')return null;
    const data=JSON.parse(sessionStorage.getItem(DATA_CACHE_KEY)||'null');
    if(!data||!Array.isArray(data.q1)||!Array.isArray(data.q2)||!Array.isArray(data.q3)||!data.types||typeof data.types!=='object')return null;
    return data;
  }catch{return null}
}
function writeCanonicalDataCache(data){
  try{
    if(typeof sessionStorage!=='undefined')sessionStorage.setItem(DATA_CACHE_KEY,JSON.stringify(data));
  }catch{}
}
async function jsonFromResponse(response,path){
  if(!response||(typeof response.ok==='boolean'&&!response.ok))throw new Error(`asset fetch failed: ${path} (${response?.status||'no response'})`);
  return await response.json();
}
async function loadJson(path){
  const hardened=typeof AbortController!=='undefined'&&typeof caches!=='undefined';
  if(!hardened)return await jsonFromResponse(await fetch(path),path);

  const controller=new AbortController();
  let timer=null;
  try{
    const timeout=new Promise((_,reject)=>{
      timer=setTimeout(()=>{
        try{controller.abort()}catch{}
        reject(new Error(`asset timeout: ${path}`));
      },2600);
    });
    const response=await Promise.race([fetch(path,{signal:controller.signal}),timeout]);
    return await jsonFromResponse(response,path);
  }catch(primaryError){
    try{
      const absolute=new URL(path,location.href).href;
      const cached=await caches.match(absolute,{ignoreSearch:true});
      if(cached)return await cached.json();
    }catch{}
    try{
      return await jsonFromResponse(await fetch(path,{cache:'reload'}),path);
    }catch{
      throw primaryError;
    }
  }finally{
    if(timer)clearTimeout(timer);
  }
}
async function boot(){
 try{
   const saved=loadState();
   if(saved?.completed)setStatus('SCAN 01 · RESTORING');
   const cachedData=readCanonicalDataCache();
   let q1,q2,q3,types;
   if(cachedData){
     ({q1,q2,q3,types}=cachedData);
   }else{
     [q1,q2,q3,types]=await Promise.all([
       loadJson('./data/questions-1.json'),
       loadJson('./data/questions-2.json'),
       loadJson('./data/questions-3.json'),
       loadJson('./data/types.json')
     ]);
     writeCanonicalDataCache({q1,q2,q3,types});
   }
   QUESTIONS=[...q1,...q2,...q3];TYPES=types;
   if(saved){state={...state,...saved};const answered=Object.keys(state.answers).length;const total=state.mode==='quick'?18:54;if(state.completed||answered>=total){renderResult()}else{state.index=answered;renderQuestion()}}
   else if(new URLSearchParams(location.search).get('start')==='scan01'){start('quick')}
   else{renderLanding()}
 }catch(err){console.error(err);view.innerHTML='<section class="load-error"><div class="kicker">82TRADE / TRADER DNA</div><h2>載入失敗</h2><p>請重新整理頁面。</p></section>'}
}
boot();
