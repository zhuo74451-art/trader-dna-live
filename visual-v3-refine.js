(()=>{
'use strict';

const VERSION='standard-v1-2026-09';
const STORAGE_KEY=`82trade-trader-dna:${VERSION}`;
const view=document.querySelector('#view');
let queued=false;
let activeShareUrl=null;
let portraitManifestPromise=null;

const PORTRAIT_OVERRIDES={
  'Jeff Bezos':{
    url:'https://upload.wikimedia.org/wikipedia/commons/3/33/Jeff_Bezos_2016.jpg',
    source:'Wikimedia Commons · CC BY 2.0'
  },
  'Philip Fisher':null
};

const WIKI_ALIASES={
  'Howard Marks':'Howard Marks (investor)',
  'Dwight Eisenhower':'Dwight D. Eisenhower',
  'Chester Nimitz':'Chester W. Nimitz',
  'Paul Tudor Jones':'Paul Tudor Jones',
  'Philip Fisher':'Philip Arthur Fisher'
};

const SIGNAL_DIMENSIONS={
  structure:{label:'判斷形成',left:'直覺',right:'結構'},
  action:{label:'行動閾值',left:'蓄勢',right:'出擊'},
  opportunity:{label:'機會取向',left:'守界',right:'捕獵'},
  reactivity:{label:'狀態反應',left:'穩態',right:'敏銳'},
  persistence:{label:'更新閾值',left:'變陣',right:'定見'},
  social:{label:'社會證據',left:'獨行',right:'共振'}
};

function state(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
}

function initials(name){
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'DNA';
}

function choices18(){
  const answers=state()?.answers||{};
  return Array.from({length:18},(_,i)=>answers[i+1]||null);
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function mountProcessRail(){
  const wrap=view?.querySelector('.quiz-wrap');
  if(!wrap)return;
  const qText=wrap.querySelector('.question-index')?.textContent?.trim()||'';
  const qNum=Number(qText.replace(/\D/g,''))||1;
  const currentState=state();
  const visible=(currentState?.mode==='quick')||(currentState?.mode==='full'&&Number(currentState.index||0)<18);
  if(!visible){wrap.querySelector('.v3-process-rail')?.remove();wrap.removeAttribute('data-refine-q');return}

  wrap.dataset.refineQ=String(qNum).padStart(2,'0');
  const answers=choices18();
  const answered=answers.filter(Boolean).length;
  const marks=answers.map((choice,i)=>{
    const n=i+1;
    const anchor=[1,6,12,18].includes(n)?String(n).padStart(2,'0'):'';
    const isCurrent=n===qNum&&!choice;
    return `<i class="v3-process-cell ${choice?`is-${choice.toLowerCase()}`:''} ${isCurrent?'is-current':''}" ${anchor?`data-anchor="${anchor}"`:''}>${anchor?`<span>${anchor}</span>`:''}</i>`;
  }).join('');

  let rail=wrap.querySelector('.v3-process-rail');
  if(!rail){
    rail=document.createElement('div');rail.className='v3-process-rail';
    const old=wrap.querySelector('.v3-answer-vector');
    if(old)old.insertAdjacentElement('afterend',rail);
    else wrap.querySelector('.bar')?.insertAdjacentElement('afterend',rail);
  }
  rail.innerHTML=`<div class="v3-process-copy"><span>DECISION TRACE</span><b>${String(answered).padStart(2,'0')} / 18</b></div><div class="v3-process-tape" aria-label="${answered} of 18 decisions registered">${marks}</div>`;
}

async function portraitManifest(){
  if(portraitManifestPromise)return portraitManifestPromise;
  portraitManifestPromise=fetch('./data/portraits.json',{cache:'force-cache'})
    .then(response=>response.ok?response.json():null)
    .catch(()=>null);
  return portraitManifestPromise;
}

async function portraitSource(name){
  const local=await portraitManifest();
  const bundled=local?.[name]||null;
  if(bundled?.kind==='image'&&bundled.url)return bundled;
  const live=PORTRAIT_OVERRIDES[name]||await wikipediaPortrait(name);
  return live||bundled;
}

async function wikipediaPortrait(name){
  const cacheKey=`tdna:portrait:${name}`;
  try{
    const cached=sessionStorage.getItem(cacheKey);
    if(cached)return JSON.parse(cached);
  }catch{}
  const title=WIKI_ALIASES[name]||name;
  try{
    const response=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,{mode:'cors',credentials:'omit',cache:'force-cache'});
    if(!response.ok)return null;
    const json=await response.json();
    const url=json.originalimage?.source||json.thumbnail?.source||null;
    if(!url)return null;
    const result={url,source:'Wikipedia / Wikimedia'};
    try{sessionStorage.setItem(cacheKey,JSON.stringify(result))}catch{}
    return result;
  }catch{return null}
}

async function hydratePortrait(figure,name){
  if(figure.dataset.hydrated==='1')return;
  figure.dataset.hydrated='1';
  figure.dataset.person=name;
  const img=figure.querySelector('img');
  const sourceEl=figure.querySelector('.v3-person-source');
  const source=await portraitSource(name);
  if(!source||!img){figure.classList.add('is-fallback');return;}
  const reveal=()=>{
    if(img.naturalWidth>0&&img.naturalHeight>0){
      figure.classList.add('has-image');
      figure.classList.toggle('is-fallback',source.kind==='fallback');
    }
  };
  img.onload=()=>{
    if(typeof img.decode==='function')img.decode().catch(()=>{}).finally(reveal);
    else reveal();
  };
  img.onerror=()=>{figure.classList.remove('has-image');figure.classList.add('is-fallback');img.removeAttribute('src')};
  img.src=source.url;
  if(img.complete)reveal();
  if(sourceEl)sourceEl.textContent=source.kind==='fallback'?'LOCAL ARCHIVE / PORTRAIT UNAVAILABLE':source.source||'';
}

function mountPeople(){
  view?.querySelectorAll('.person').forEach((person,index)=>{
    if(person.dataset.refined==='1')return;
    const raw=person.textContent.trim();
    if(!raw)return;
    const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const nameLine=lines.shift()||'';
    const [english='',local='']=nameLine.split('｜').map(x=>x.trim());
    const desc=lines.join(' ');
    const monogram=initials(english||local);
    person.dataset.refined='1';
    person.innerHTML=`
      <figure class="v3-person-portrait">
        <div class="v3-person-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</div>
        <div class="v3-person-fallback" aria-hidden="true"><span>ARCHIVE</span><b>${monogram}</b><small>PORTRAIT / LOCAL FALLBACK</small></div>
        <img alt="" aria-hidden="true" loading="eager" fetchpriority="high" decoding="async" referrerpolicy="no-referrer" />
        <figcaption class="v3-person-source"></figcaption>
      </figure>
      <div class="v3-person-copy">
        <div class="v3-person-name">${escapeHtml(english)}${local?`<small>${escapeHtml(local)}</small>`:''}</div>
        <div class="v3-person-desc">${escapeHtml(desc)}</div>
      </div>`;
    hydratePortrait(person.querySelector('.v3-person-portrait'),english||local);
  });
}

function dimensionEntries(){
  const dims=state()?.completedRecord?.dimensions;
  if(!dims||typeof dims!=='object')return [];
  return Object.entries(SIGNAL_DIMENSIONS).map(([key,meta])=>{
    const value=Number(dims[key]);
    if(!Number.isFinite(value))return null;
    const clamped=Math.max(-1,Math.min(1,value));
    const rightPct=Math.round((clamped+1)*50);
    const leftPct=100-rightPct;
    const side=clamped>=0?meta.right:meta.left;
    const sidePct=clamped>=0?rightPct:leftPct;
    return {key,meta,value:clamped,side,sidePct,leftPct,rightPct,strength:Math.abs(clamped)};
  }).filter(Boolean);
}

function signalSnapshot(){
  const entries=dimensionEntries();
  if(entries.length!==6)return null;
  const pronounced=[...entries].sort((a,b)=>b.strength-a.strength).slice(0,3);
  const balanced=[...entries].sort((a,b)=>a.strength-b.strength)[0];
  return {entries,pronounced,balanced};
}

function byKey(entries,key){return entries.find(entry=>entry.key===key)}
function axisLine(entry){return `${entry.meta.left} ${entry.leftPct} / ${entry.rightPct} ${entry.meta.right}`}
function tendency(entry,leftCopy,rightCopy,balancedCopy){
  if(entry.strength<.17&&balancedCopy)return balancedCopy;
  return entry.value>=0?rightCopy:leftCopy;
}

function decisionScenes(snapshot){
  const structure=byKey(snapshot.entries,'structure');
  const action=byKey(snapshot.entries,'action');
  const opportunity=byKey(snapshot.entries,'opportunity');
  const persistence=byKey(snapshot.entries,'persistence');
  const reactivity=byKey(snapshot.entries,'reactivity');

  const infoCopy=tendency(
    structure,
    '資訊還沒齊時，這次輪廓更容易先抓整體感、異常與方向，再回頭補結構。',
    '資訊還沒齊時，這次輪廓更容易先把線索拆成結構，再形成第一個可執行的判斷。',
    '資訊還沒齊時，直覺與結構都會參與；這次結果沒有明顯把第一判斷交給其中一邊。'
  );

  let opportunityCopy='';
  if(action.value>=0&&opportunity.value>=0)opportunityCopy='機會突然出現時，這次輪廓同時偏向靠近新可能、也較快把判斷推進到行動。';
  else if(action.value<0&&opportunity.value>=0)opportunityCopy='機會突然出現時，你的輪廓會先靠近、觀察新可能，但通常希望它再累積一些證據才真正出手。';
  else if(action.value>=0&&opportunity.value<0)opportunityCopy='機會突然出現時，你的行動節奏不慢，但注意力更偏向已有邊界內的可控機會，而不是每個新可能。';
  else opportunityCopy='機會突然出現時，這次輪廓更容易先守住邊界，讓機會自己證明值得被追，再決定是否推進。';

  let challengeCopy='';
  if(persistence.value<0&&reactivity.value>=0)challengeCopy='原判斷被挑戰時，你較快感到環境變化，也更願意把新訊號帶回原判斷裡重新計算。';
  else if(persistence.value>=0&&reactivity.value>=0)challengeCopy='原判斷被挑戰時，變化你會很快感到，但不代表立刻改；更像先感知，再等足夠反證決定是否推翻。';
  else if(persistence.value<0&&reactivity.value<0)challengeCopy='原判斷被挑戰時，短暫波動不容易先把你帶走；一旦確認環境真的變了，調整意願反而不低。';
  else challengeCopy='原判斷被挑戰時，外部變化不容易立刻擾動你；通常要遇到更強的反證，原來的判斷才會鬆動。';

  return [
    {no:'01',title:'資訊還不完整時',copy:infoCopy,axes:[structure]},
    {no:'02',title:'機會突然出現時',copy:opportunityCopy,axes:[action,opportunity]},
    {no:'03',title:'原判斷被挑戰時',copy:challengeCopy,axes:[persistence,reactivity]}
  ];
}

function fingerprintMarkup(){
  return choices18().map((choice,i)=>`<i class="${choice?`is-${choice.toLowerCase()}`:'is-empty'}" data-n="${String(i+1).padStart(2,'0')}"></i>`).join('');
}

function mountDecisionScenes(result,snapshot){
  if(result.querySelector('.v3-decision-scenes'))return;
  const scenes=decisionScenes(snapshot);
  const section=document.createElement('section');
  section.className='v3-decision-scenes';
  section.id='tdna-decision-scenes';
  section.innerHTML=`
    <div class="v3-scenes-head"><span>DECISION SCENES / CONTEXT READOUT</span><b>不是建議，是把六維輪廓放回三個真實決策時刻</b></div>
    <div class="v3-scenes-grid">
      ${scenes.map(scene=>`<article class="v3-scene-card">
        <div class="v3-scene-no">${scene.no}</div>
        <h3>${scene.title}</h3>
        <p>${scene.copy}</p>
        <div class="v3-scene-axes">${scene.axes.map(entry=>`<span><b>${entry.meta.label}</b>${axisLine(entry)}</span>`).join('')}</div>
      </article>`).join('')}
    </div>`;
  const grid=result.querySelector('.result-grid');
  if(grid)grid.insertAdjacentElement('beforebegin',section);
}

function resultIdentity(){
  const result=view?.querySelector('.result');
  if(!result)return null;
  const code=result.querySelector('.code')?.textContent?.trim()||'';
  const name=result.querySelector('.identity')?.textContent?.trim()||'';
  const hook=result.querySelector('.hook')?.textContent?.trim()||'';
  const accent=getComputedStyle(result).getPropertyValue('--tc').trim()||'#c8ff35';
  return code&&name?{code,name,hook,accent}:null;
}

function hexColor(hex,fallback='#c8ff35'){
  return /^#[0-9a-f]{6}$/i.test(hex||'')?hex:fallback;
}

function wrapCanvasText(ctx,text,maxWidth){
  const chars=Array.from(String(text||''));
  const lines=[];let line='';
  chars.forEach(char=>{
    const test=line+char;
    if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=char}else line=test;
  });
  if(line)lines.push(line);
  return lines;
}

function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

function drawFingerprint(ctx,choices,x,y,w,h,ink,accent){
  const gap=8;
  const cell=(w-gap*17)/18;
  const mid=y+h/2;
  ctx.strokeStyle='rgba(10,10,9,.16)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,mid);ctx.lineTo(x+w,mid);ctx.stroke();
  choices.forEach((choice,i)=>{
    const cx=x+i*(cell+gap)+cell/2;
    const len=choice?Math.min(h*.78,42+(i%4)*8):10;
    ctx.strokeStyle=choice?(i%5===0?accent:ink):'rgba(10,10,9,.18)';
    ctx.lineWidth=Math.max(3,cell*.34);ctx.lineCap='square';
    ctx.beginPath();ctx.moveTo(cx,mid+(choice==='B'?4:-4));ctx.lineTo(cx,mid+(choice==='A'?-len:choice==='B'?len:0));ctx.stroke();
  });
}

function shareCardData(){
  const identity=resultIdentity();
  const snapshot=signalSnapshot();
  if(!identity||!snapshot)return null;
  return {...identity,snapshot,choices:choices18(),version:VERSION};
}

function renderShareCard(format='4:5'){
  const data=shareCardData();
  if(!data)throw new Error('Trader DNA result is not ready');
  const portrait=format==='9:16';
  const W=1080,H=portrait?1920:1350;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.dataset.format=format;
  const ctx=canvas.getContext('2d');
  const paper='#efede6',ink='#0a0a09',muted='#6f6c65',accent=hexColor(data.accent);
  ctx.fillStyle=paper;ctx.fillRect(0,0,W,H);

  ctx.strokeStyle='rgba(10,10,9,.16)';ctx.lineWidth=2;
  ctx.strokeRect(48,48,W-96,H-96);
  ctx.beginPath();ctx.moveTo(48,132);ctx.lineTo(W-48,132);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W-224,48);ctx.lineTo(W-224,H-48);ctx.stroke();

  ctx.fillStyle=ink;ctx.font='700 22px ui-monospace, Menlo, monospace';ctx.fillText('82TRADE / TRADER DNA',74,100);
  ctx.fillStyle=muted;ctx.textAlign='right';ctx.fillText('SCAN 01 / ISSUED',W-74,100);ctx.textAlign='left';

  ctx.fillStyle=accent;ctx.fillRect(74,176,10,portrait?520:360);
  ctx.fillStyle=ink;ctx.font='900 196px Arial Black, Arial, sans-serif';ctx.fillText(data.code,116,portrait?420:392);
  ctx.font='700 54px "Noto Serif TC", "Songti TC", serif';ctx.fillText(data.name,118,portrait?510:482);

  ctx.fillStyle=muted;ctx.font='500 31px "Noto Sans TC", "PingFang TC", Arial, sans-serif';
  const hookLines=wrapCanvasText(ctx,data.hook,portrait?760:760).slice(0,3);
  hookLines.forEach((line,i)=>ctx.fillText(line,118,(portrait?590:562)+i*48));

  const signalY=portrait?790:736;
  ctx.fillStyle=ink;ctx.font='700 19px ui-monospace, Menlo, monospace';ctx.fillText('PROFILE SIGNALS / TOP 03',74,signalY);
  const signalTop=signalY+44;
  data.snapshot.pronounced.forEach((entry,index)=>{
    const y=signalTop+index*(portrait?150:126);
    ctx.fillStyle='rgba(10,10,9,.08)';roundRect(ctx,74,y,W-148,portrait?118:96,0);ctx.fill();
    ctx.fillStyle=muted;ctx.font='700 17px ui-monospace, Menlo, monospace';ctx.fillText(`0${index+1}  ${entry.meta.label}`,96,y+30);
    ctx.fillStyle=ink;ctx.font=`800 ${portrait?46:38}px "Noto Sans TC", "PingFang TC", Arial, sans-serif`;ctx.fillText(entry.side,96,y+(portrait?80:68));
    ctx.textAlign='right';ctx.fillStyle=muted;ctx.font='600 18px ui-monospace, Menlo, monospace';ctx.fillText(`${entry.sidePct}%`,W-96,y+(portrait?80:68));ctx.textAlign='left';
  });

  const fpY=portrait?1325:1112;
  ctx.fillStyle=ink;ctx.font='700 19px ui-monospace, Menlo, monospace';ctx.fillText('18-DECISION FINGERPRINT',74,fpY);
  ctx.textAlign='right';ctx.fillStyle=muted;ctx.fillText('A ↑ / B ↓',W-74,fpY);ctx.textAlign='left';
  drawFingerprint(ctx,data.choices,74,fpY+30,W-148,portrait?210:150,ink,accent);

  if(portrait){
    const scene=decisionScenes(data.snapshot)[0];
    ctx.fillStyle=ink;ctx.font='700 18px ui-monospace, Menlo, monospace';ctx.fillText('CONTEXT / 資訊還不完整時',74,1636);
    ctx.fillStyle=muted;ctx.font='500 27px "Noto Sans TC", "PingFang TC", Arial, sans-serif';
    wrapCanvasText(ctx,scene.copy,790).slice(0,3).forEach((line,i)=>ctx.fillText(line,74,1688+i*42));
  }

  ctx.strokeStyle='rgba(10,10,9,.16)';ctx.beginPath();ctx.moveTo(74,H-112);ctx.lineTo(W-74,H-112);ctx.stroke();
  ctx.fillStyle=muted;ctx.font='600 16px ui-monospace, Menlo, monospace';ctx.fillText(`ASSESSMENT ${data.version}`,74,H-74);
  ctx.textAlign='right';ctx.fillText('KNOW YOUR PATTERN.',W-74,H-74);ctx.textAlign='left';
  return canvas;
}

async function canvasBlob(canvas){
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encode failed')),'image/png',1));
}

async function buildSharePreview(format='4:5'){
  const studio=view?.querySelector('.v3-share-studio');
  if(!studio)return null;
  studio.dataset.format=format;
  studio.querySelectorAll('[data-share-format]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.shareFormat===format));
  const stage=studio.querySelector('.v3-share-stage');
  stage.setAttribute('aria-busy','true');
  try{
    const canvas=renderShareCard(format),blob=await canvasBlob(canvas);
    if(activeShareUrl)URL.revokeObjectURL(activeShareUrl);
    activeShareUrl=URL.createObjectURL(blob);
    const img=stage.querySelector('img');img.src=activeShareUrl;img.alt=`Trader DNA ${resultIdentity()?.code||''} ${format} 分享卡`;
    stage.classList.add('is-ready');stage.removeAttribute('aria-busy');
    studio._shareBlob=blob;studio._shareFormat=format;
    return {blob,url:activeShareUrl,canvas};
  }catch(error){stage.removeAttribute('aria-busy');stage.dataset.error=error.message;throw error}
}

async function shareCurrentCard(){
  const studio=view?.querySelector('.v3-share-studio');
  if(!studio)return;
  if(!studio._shareBlob)await buildSharePreview(studio.dataset.format||'4:5');
  const identity=resultIdentity();
  const format=studio._shareFormat||'4:5';
  const file=new File([studio._shareBlob],`82TRADE-TraderDNA-${identity?.code||'SCAN01'}-${format.replace(':','x')}.png`,{type:'image/png'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:`${identity?.code||''} · ${identity?.name||'Trader DNA'}`,text:'82TRADE / Trader DNA'});return}catch(error){if(error?.name==='AbortError')return}
  }
  const a=document.createElement('a');a.href=activeShareUrl;a.download=file.name;a.rel='noopener';a.click();
}

function mountShareStudio(result){
  if(result.querySelector('.v3-share-studio'))return;
  const studio=document.createElement('section');
  studio.className='v3-share-studio';studio.dataset.format='4:5';
  studio.innerHTML=`
    <div class="v3-share-studio-copy">
      <span>PUBLISH ARTIFACT / PUBLIC</span>
      <h3>把這次身份，發佈成一張可以帶走的作品。</h3>
      <p>先把已簽發的 Identity Plate 壓平成公開 Artifact。只保留公開身份、Profile Signals 與 18 次決策指紋；私人提醒和人物肖像不會進入分享圖。</p>
      <div class="v3-share-formats"><button type="button" data-share-format="4:5" class="is-active">4:5</button><button type="button" data-share-format="9:16">9:16</button></div>
      <button type="button" class="btn v3-share-generate">發佈身份海報 <span>→</span></button>
    </div>
    <div class="v3-share-stage" aria-live="polite"><div class="v3-share-placeholder"><b>ISSUED OBJECT</b><span>DNA / SIGNALS / 18 DECISIONS</span></div><img alt="" /></div>
    <div class="v3-share-tools"><button type="button" class="btn v3-share-native">分享 / 保存 PNG <span>→</span></button><span>支援檔案分享時會叫出手機系統分享；否則下載原圖。</span></div>`;
  const actions=result.querySelector('.actions');
  if(actions)actions.insertAdjacentElement('beforebegin',studio);else result.appendChild(studio);
  studio.querySelectorAll('[data-share-format]').forEach(btn=>btn.addEventListener('click',()=>buildSharePreview(btn.dataset.shareFormat)));
  studio.querySelector('.v3-share-generate').addEventListener('click',()=>buildSharePreview(studio.dataset.format||'4:5'));
  studio.querySelector('.v3-share-native').addEventListener('click',shareCurrentCard);
}

function mountResultDepth(){
  const result=view?.querySelector('.result');
  if(!result||result.dataset.depthRefined==='1')return;
  const snapshot=signalSnapshot();
  if(!snapshot)return;
  result.dataset.depthRefined='1';

  const signalSection=document.createElement('section');
  signalSection.className='v3-signal-strip';
  signalSection.innerHTML=`
    <div class="v3-signal-head">
      <span>PROFILE SIGNALS / SIX-DIMENSION READOUT</span>
      <b>偏移最明顯 ≠ 好壞，只代表這次輪廓更清楚</b>
    </div>
    <div class="v3-signal-grid">
      ${snapshot.pronounced.map((entry,index)=>`<article class="v3-signal-card"><div class="v3-signal-no">0${index+1}</div><strong>${entry.side}</strong><span>${entry.meta.label}</span><small>${axisLine(entry)}</small></article>`).join('')}
      <article class="v3-signal-card is-balanced"><div class="v3-signal-no">CENTER</div><strong>${snapshot.balanced.meta.left} ↔ ${snapshot.balanced.meta.right}</strong><span>${snapshot.balanced.meta.label}</span><small>${snapshot.balanced.leftPct} / ${snapshot.balanced.rightPct} · 最接近中線</small></article>
    </div>`;
  const grid=result.querySelector('.result-grid');
  if(grid)grid.insertAdjacentElement('beforebegin',signalSection);

  mountDecisionScenes(result,snapshot);

  const share=result.querySelector('.share-preview');
  if(share&&!share.querySelector('.v3-share-fingerprint')){
    share.insertAdjacentHTML('beforeend',`
      <div class="v3-share-fingerprint" aria-hidden="true">
        <div class="v3-share-fingerprint-head"><span>18-DECISION FINGERPRINT</span><b>SCAN 01</b></div>
        <div class="v3-share-fingerprint-bars">${fingerprintMarkup()}</div>
      </div>`);
  }

  const sectionMap=[
    ['01','決策畫像',result.querySelector('.portrait-section')],
    ['02','決策場景',result.querySelector('.v3-decision-scenes')],
    ['03','六維輪廓',result.querySelector('.dims-section')],
    ['04','同型人物',[...result.querySelectorAll('.section')].find(section=>section.querySelector('h3')?.textContent?.includes('同型人物'))],
    ['P','私人提醒',result.querySelector('.reminder')]
  ].filter(([, ,section])=>section);
  sectionMap.forEach(([, ,section],index)=>{section.id=section.id||`tdna-dossier-${index+1}`;section.style.scrollMarginTop='86px'});
  if(sectionMap.length===5){
    const nav=document.createElement('nav');
    nav.className='v3-dossier-index';
    nav.setAttribute('aria-label','結果頁索引');
    nav.innerHTML=`<div class="v3-dossier-index-title">DOSSIER</div>${sectionMap.map(([no,label,section])=>`<a href="#${section.id}"><b>${no}</b><span>${label}</span></a>`).join('')}`;
    result.insertAdjacentElement('afterbegin',nav);
  }
  mountShareStudio(result);
}

function sync(){
  queued=false;
  mountProcessRail();
  mountPeople();
  mountResultDepth();
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}

window.TraderDNAShareCard={render:renderShareCard,data:shareCardData,build:buildSharePreview};
new MutationObserver(queue).observe(view,{childList:true,subtree:true});
addEventListener('pageshow',queue);
addEventListener('beforeunload',()=>{if(activeShareUrl)URL.revokeObjectURL(activeShareUrl)});
queue();
})();
