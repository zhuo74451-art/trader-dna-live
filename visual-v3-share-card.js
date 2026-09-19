(()=>{
'use strict';

let activeUrl=null;
const PAPER='#efe9dc';
const INK='#0a0a09';
const MUTED='#69655d';

function hexColor(hex,fallback='#c8ff35'){
  return /^#[0-9a-f]{6}$/i.test(hex||'')?hex:fallback;
}
function roundRect(ctx,x,y,w,h,r=0){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function wrapText(ctx,text,maxWidth){
  const lines=[];let line='';
  for(const char of Array.from(String(text||''))){
    const test=line+char;
    if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=char}else line=test;
  }
  if(line)lines.push(line);
  const orphan=/^[，。！？；：、）》」』】…]+$/;
  for(let i=lines.length-1;i>0;i--){
    if(orphan.test(lines[i])){lines[i-1]+=lines[i];lines.splice(i,1)}
  }
  return lines;
}
function drawDust(ctx,W,H){
  ctx.save();
  for(let i=0;i<72;i++){
    const x=(Math.sin(i*12.9898)*43758.5453%1+1)%1*W;
    const y=(Math.sin(i*78.233+2.1)*24634.6345%1+1)%1*H;
    const r=.45+(i%7)*.22;
    ctx.fillStyle=`rgba(255,235,190,${.025+(i%5)*.012})`;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawScene(ctx,W,H,accent){
  ctx.fillStyle='#050505';ctx.fillRect(0,0,W,H);

  let g=ctx.createRadialGradient(W*.84,H*.05,0,W*.84,H*.05,W*.78);
  g.addColorStop(0,'rgba(255,244,218,.34)');g.addColorStop(.16,'rgba(255,222,170,.14)');g.addColorStop(.52,'rgba(255,222,170,.035)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  g=ctx.createRadialGradient(W*.56,H*.88,0,W*.56,H*.88,W*.52);
  g.addColorStop(0,'rgba(255,232,188,.25)');g.addColorStop(.25,'rgba(255,223,160,.07)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  ctx.save();
  const beam=ctx.createLinearGradient(W*.5,0,W*.92,H*.72);
  beam.addColorStop(0,'rgba(255,255,255,.13)');beam.addColorStop(.28,'rgba(255,240,205,.045)');beam.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=beam;
  ctx.beginPath();ctx.moveTo(W*.77,0);ctx.lineTo(W,0);ctx.lineTo(W*.84,H*.75);ctx.lineTo(W*.52,H*.68);ctx.closePath();ctx.fill();
  ctx.restore();

  const floor=ctx.createLinearGradient(0,H*.78,0,H);
  floor.addColorStop(0,'rgba(0,0,0,0)');floor.addColorStop(.42,'rgba(30,24,16,.6)');floor.addColorStop(1,'rgba(0,0,0,.96)');
  ctx.fillStyle=floor;ctx.fillRect(0,H*.74,W,H*.26);

  ctx.strokeStyle='rgba(255,240,210,.08)';ctx.lineWidth=1;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(0,H*(.84+i*.035));ctx.lineTo(W,H*(.82+i*.038));ctx.stroke()}
  drawDust(ctx,W,H);

  ctx.save();
  ctx.globalAlpha=.22;
  ctx.strokeStyle=accent;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(W*.08,H*.115);ctx.lineTo(W*.14,H*.115);ctx.stroke();
  ctx.restore();
}
function drawFingerprint(ctx,choices,x,y,w,h,accent){
  const gap=6,cell=(w-gap*17)/18,mid=y+h/2;
  ctx.strokeStyle='rgba(10,10,9,.14)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,mid);ctx.lineTo(x+w,mid);ctx.stroke();
  choices.forEach((choice,i)=>{
    const cx=x+i*(cell+gap)+cell/2;
    const len=choice?Math.min(h*.66,24+(i%4)*5):7;
    ctx.strokeStyle=choice?(i%5===0?accent:INK):'rgba(10,10,9,.16)';
    ctx.lineWidth=Math.max(2.2,cell*.28);ctx.lineCap='square';ctx.beginPath();
    ctx.moveTo(cx,mid+(choice==='B'?3:-3));
    ctx.lineTo(cx,mid+(choice==='A'?-len:choice==='B'?len:0));ctx.stroke();
  });
}
function drawBackdropPoster(ctx,data,W,H,accent,portrait){
  ctx.save();
  const x=portrait?W*.18:W*.13;
  const y=portrait?H*.28:H*.20;
  const w=portrait?W*.68:W*.73;
  const h=portrait?H*.53:H*.65;
  ctx.translate(x+w/2,y+h/2);
  ctx.rotate(.045);
  ctx.translate(-w/2,-h/2);
  ctx.fillStyle='rgba(16,15,13,.92)';
  roundRect(ctx,0,0,w,h,12);ctx.fill();
  ctx.strokeStyle='rgba(245,239,226,.12)';ctx.lineWidth=2;roundRect(ctx,0,0,w,h,12);ctx.stroke();
  ctx.fillStyle='rgba(245,239,226,.08)';
  ctx.font=`900 ${Math.floor(w*.29)}px Arial Black, Arial, sans-serif`;
  ctx.fillText(data.code,w*.07,h*.78);
  ctx.fillStyle='rgba(245,239,226,.35)';
  ctx.font='700 13px ui-monospace, Menlo, monospace';
  ctx.fillText('PUBLIC IDENTITY / 82TRADE',w*.07,h*.10);
  ctx.fillStyle=accent;ctx.fillRect(w*.07,h*.14,Math.max(38,w*.08),3);
  ctx.restore();
}
function drawForegroundTag(ctx,W,H,portrait){
  const w=portrait?270:252,h=54;
  const x=portrait?W*.63:W*.67;
  const y=portrait?H*.41:H*.45;
  ctx.save();
  ctx.translate(x,y);ctx.rotate(.035);
  ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=26;ctx.shadowOffsetY=14;
  ctx.fillStyle='#f1ece2';roundRect(ctx,0,0,w,h,8);ctx.fill();
  ctx.shadowColor='transparent';
  ctx.fillStyle='#0a0a09';ctx.font='800 11px ui-monospace, Menlo, monospace';
  ctx.fillText('ISSUED / SCAN 01',18,22);
  ctx.fillStyle='rgba(10,10,9,.5)';ctx.font='700 9px ui-monospace, Menlo, monospace';
  ctx.fillText('18 DECISIONS · SEALED',18,39);
  ctx.restore();
}
function drawPlateTexture(ctx,x,y,w,h){
  ctx.save();roundRect(ctx,x,y,w,h,8);ctx.clip();
  for(let i=0;i<54;i++){
    const yy=y+(i/53)*h;
    ctx.strokeStyle=`rgba(70,62,49,${i%4===0?.018:.009})`;
    ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy+(i%3-1)*2);ctx.stroke();
  }
  ctx.restore();
}
function signalFields(data){
  const top=(data.snapshot?.pronounced||[]).slice(0,3).map((entry,index)=>({
    no:`0${index+1}`,
    title:entry.side,
    meta:entry.meta?.label||'PROFILE SIGNAL',
    value:`${entry.sidePct}%`
  }));
  while(top.length<3)top.push({no:`0${top.length+1}`,title:'PROFILE',meta:'SIGNAL',value:'—'});
  top.push({no:'04',title:'18 DECISIONS',meta:'SEALED',value:'18 / 18'});
  return top;
}
function drawPlate(ctx,data,rect,angle,accent){
  const {x,y,w,h}=rect;
  ctx.save();
  ctx.translate(x+w/2,y+h/2);
  ctx.rotate(angle);
  ctx.transform(1,.018,-.035,1,0,0);
  const px=-w/2,py=-h/2;

  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.66)';ctx.shadowBlur=72;ctx.shadowOffsetX=-24;ctx.shadowOffsetY=42;
  ctx.fillStyle='rgba(28,23,18,.94)';roundRect(ctx,px+13,py+15,w,h,10);ctx.fill();
  ctx.restore();

  const edge=ctx.createLinearGradient(px,py,px+w,py+h);
  edge.addColorStop(0,'#8f8169');edge.addColorStop(.28,'#2a251e');edge.addColorStop(.72,'#88775c');edge.addColorStop(1,'#211c16');
  ctx.fillStyle=edge;roundRect(ctx,px+8,py+10,w,h,10);ctx.fill();

  const paper=ctx.createLinearGradient(px,py,px+w,py+h);
  paper.addColorStop(0,'#f7f1e6');paper.addColorStop(.42,'#eee7da');paper.addColorStop(.78,'#d8d0c1');paper.addColorStop(1,'#f1eadf');
  ctx.fillStyle=paper;roundRect(ctx,px,py,w,h,8);ctx.fill();
  drawPlateTexture(ctx,px,py,w,h);

  ctx.strokeStyle='rgba(10,10,9,.22)';ctx.lineWidth=1.4;roundRect(ctx,px+1,py+1,w-2,h-2,7);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+10,py+3);ctx.lineTo(px+w-14,py+3);ctx.stroke();

  ctx.fillStyle=accent;ctx.fillRect(px+34,py+64,4,h*.48);

  const left=px+72,right=px+w-62;
  ctx.fillStyle=INK;ctx.font='800 22px Arial, sans-serif';ctx.fillText('82TRADE',left,py+76);
  ctx.fillStyle=MUTED;ctx.font='650 14px ui-monospace, Menlo, monospace';ctx.fillText('TRADER DNA',left,py+98);

  ctx.textAlign='right';ctx.fillStyle=MUTED;ctx.font='650 13px ui-monospace, Menlo, monospace';
  ctx.fillText('IDENTITY PLATE / PUBLIC',right,py+72);ctx.fillText('// 001',right,py+98);ctx.textAlign='left';

  const codeSize=Math.min(188,w*.235);
  ctx.fillStyle=INK;ctx.font=`900 ${codeSize}px Arial Black, Arial, sans-serif`;ctx.fillText(data.code,left,py+h*.405);
  ctx.font='800 52px "Noto Sans TC","PingFang TC",Arial,sans-serif';ctx.fillText(data.name,left+2,py+h*.485);
  ctx.fillStyle=MUTED;ctx.font='700 15px ui-monospace, Menlo, monospace';ctx.letterSpacing='0px';ctx.fillText('IDENTITY UNDER PRESSURE',left+2,py+h*.525);

  const lineY=py+h*.565;
  ctx.strokeStyle='rgba(10,10,9,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,lineY);ctx.lineTo(right,lineY);ctx.stroke();

  const fields=signalFields(data),gap=12,fieldW=(right-left-gap*3)/4,fy=lineY+28,fh=h*.19;
  fields.forEach((field,index)=>{
    const fx=left+index*(fieldW+gap);
    if(index>0){ctx.strokeStyle='rgba(10,10,9,.15)';ctx.beginPath();ctx.moveTo(fx-gap/2,fy);ctx.lineTo(fx-gap/2,fy+fh);ctx.stroke()}
    ctx.fillStyle=MUTED;ctx.font='700 12px ui-monospace, Menlo, monospace';ctx.fillText(field.no,fx,fy+12);
    ctx.fillStyle=INK;
    const titleSize=field.title.length>8?18:26;
    ctx.font=`800 ${titleSize}px "Noto Sans TC","PingFang TC",Arial,sans-serif`;
    const titleLines=wrapText(ctx,field.title,fieldW-4).slice(0,2);
    titleLines.forEach((line,i)=>ctx.fillText(line,fx,fy+48+i*25));
    ctx.fillStyle=MUTED;ctx.font='650 10px ui-monospace, Menlo, monospace';ctx.fillText(field.meta,fx,fy+104);
    ctx.fillStyle=INK;ctx.font='750 12px ui-monospace, Menlo, monospace';ctx.fillText(field.value,fx,fy+128);
  });

  const fpY=py+h*.795;
  ctx.strokeStyle='rgba(10,10,9,.16)';ctx.beginPath();ctx.moveTo(left,fpY-18);ctx.lineTo(right,fpY-18);ctx.stroke();
  ctx.fillStyle=MUTED;ctx.font='700 10px ui-monospace, Menlo, monospace';ctx.fillText('18-DECISION FINGERPRINT',left,fpY);
  ctx.textAlign='right';ctx.fillText('A ↑ / B ↓',right,fpY);ctx.textAlign='left';
  drawFingerprint(ctx,data.choices,left,fpY+15,right-left,70,accent);

  const footerY=py+h-54;
  ctx.strokeStyle='rgba(10,10,9,.15)';ctx.beginPath();ctx.moveTo(left,footerY-24);ctx.lineTo(right,footerY-24);ctx.stroke();
  ctx.fillStyle=MUTED;ctx.font='650 9px ui-monospace, Menlo, monospace';ctx.fillText(`ASSESSMENT ${data.version}`,left,footerY);
  ctx.textAlign='right';ctx.fillText('82TRADE / PUBLIC DNA RESULT',right,footerY);ctx.textAlign='left';

  ctx.restore();
}
function drawPublicationFrame(ctx,W,H,accent){
  const inset=46;
  ctx.strokeStyle='rgba(243,238,228,.16)';ctx.lineWidth=1.5;ctx.strokeRect(inset,inset,W-inset*2,H-inset*2);
  ctx.fillStyle=accent;ctx.fillRect(inset,inset,92,3);
  ctx.fillStyle='rgba(243,238,228,.82)';ctx.font='800 17px Arial, sans-serif';ctx.fillText('82TRADE  //  TRADER DNA',inset+12,inset+34);
  ctx.textAlign='right';ctx.fillStyle='rgba(243,238,228,.46)';ctx.font='650 11px ui-monospace, Menlo, monospace';ctx.fillText('IDENTITY / PUBLISHED',W-inset-12,inset+32);ctx.textAlign='left';
}
function drawCanonicalPublishedPlate(ctx,data,rect,accent){
  const {x,y,w,h}=rect;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=54;ctx.shadowOffsetY=28;
  const paper=ctx.createLinearGradient(x,y,x+w,y+h);paper.addColorStop(0,'#f5f0e6');paper.addColorStop(.48,'#ece5d9');paper.addColorStop(1,'#d7cfc0');
  ctx.fillStyle=paper;roundRect(ctx,x,y,w,h,5);ctx.fill();ctx.shadowColor='transparent';drawPlateTexture(ctx,x,y,w,h);
  ctx.strokeStyle='rgba(10,10,9,.25)';ctx.lineWidth=1.4;roundRect(ctx,x+.8,y+.8,w-1.6,h-1.6,4);ctx.stroke();
  ctx.fillStyle=accent;ctx.fillRect(x+32,y+38,4,h-76);
  const left=x+72,right=x+w-52;
  ctx.fillStyle=INK;ctx.font='800 17px Arial, sans-serif';ctx.fillText('82TRADE',left,y+58);
  ctx.fillStyle=MUTED;ctx.font='650 11px ui-monospace, Menlo, monospace';ctx.fillText('IDENTITY PLATE / SCAN 01',left,y+78);
  ctx.textAlign='right';ctx.fillText('SEALED / 18 DECISIONS',right,y+58);ctx.fillText('PUBLIC ISSUE',right,y+78);ctx.textAlign='left';
  const codeSize=Math.min(146,w*.17);ctx.fillStyle=INK;ctx.font=`900 ${codeSize}px Arial Black, Arial, sans-serif`;ctx.fillText(data.code,left,y+h*.39);
  ctx.font='800 41px "Noto Sans TC","PingFang TC",Arial,sans-serif';ctx.fillText(data.name,left+2,y+h*.49);
  const ruleY=y+h*.565;ctx.strokeStyle='rgba(10,10,9,.18)';ctx.beginPath();ctx.moveTo(left,ruleY);ctx.lineTo(right,ruleY);ctx.stroke();
  ctx.fillStyle=MUTED;ctx.font='700 10px ui-monospace, Menlo, monospace';ctx.fillText('18-DECISION SIGNATURE',left,ruleY+25);
  ctx.textAlign='right';ctx.fillText('A ↑ / B ↓',right,ruleY+25);ctx.textAlign='left';
  drawFingerprint(ctx,data.choices,left,ruleY+40,right-left,h*.20,accent);
  const footer=y+h-38;ctx.strokeStyle='rgba(10,10,9,.14)';ctx.beginPath();ctx.moveTo(left,footer-24);ctx.lineTo(right,footer-24);ctx.stroke();
  ctx.fillStyle=MUTED;ctx.font='650 9px ui-monospace, Menlo, monospace';ctx.fillText(`ASSESSMENT ${data.version}`,left,footer);
  ctx.textAlign='right';ctx.fillText('82TRADE / IDENTITY ISSUED',right,footer);ctx.textAlign='left';ctx.restore();
}
function drawPublishedSignalRail(ctx,data,x,y,w,accent){
  const signals=(data.snapshot?.pronounced||[]).slice(0,3);ctx.strokeStyle='rgba(243,238,228,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  const col=w/3;
  signals.forEach((entry,index)=>{
    const cx=x+index*col;if(index){ctx.beginPath();ctx.moveTo(cx,y+18);ctx.lineTo(cx,y+112);ctx.stroke()}
    ctx.fillStyle=index===0?accent:'rgba(243,238,228,.42)';ctx.font='750 10px ui-monospace, Menlo, monospace';ctx.fillText(`0${index+1} / ${entry.meta?.label||'PROFILE SIGNAL'}`,cx+(index?22:0),y+32);
    ctx.fillStyle='#f3eee4';ctx.font='800 28px "Noto Sans TC","PingFang TC",Arial,sans-serif';ctx.fillText(entry.side||'PROFILE',cx+(index?22:0),y+72);
    ctx.fillStyle='rgba(243,238,228,.48)';ctx.font='650 11px ui-monospace, Menlo, monospace';ctx.fillText(`${entry.sidePct??'—'}% / PUBLIC SIGNAL`,cx+(index?22:0),y+98);
  });
}
function drawPublishedBackdrop(ctx,data,W,H,accent,portrait){
  ctx.fillStyle='#060606';ctx.fillRect(0,0,W,H);
  let g=ctx.createRadialGradient(W*.76,H*.14,0,W*.76,H*.14,W*.74);g.addColorStop(0,'rgba(255,236,198,.10)');g.addColorStop(.42,'rgba(255,236,198,.025)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.075;ctx.fillStyle='#f3eee4';ctx.font=`900 ${portrait?300:250}px Arial Black, Arial, sans-serif`;ctx.textAlign='right';ctx.fillText(data.code,W+14,portrait?330:265);ctx.textAlign='left';ctx.restore();
  ctx.fillStyle=accent;ctx.fillRect(46,H-49,86,3);
}
function render(format='4:5'){
  const data=window.TraderDNAShareCard?.data?.();if(!data)throw new Error('Trader DNA result is not ready');
  const portrait=format==='9:16';const W=1080,H=portrait?1920:1350,accent=hexColor(data.accent);
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.dataset.format=format;canvas.dataset.artifact='v48-published';
  const ctx=canvas.getContext('2d');drawPublishedBackdrop(ctx,data,W,H,accent,portrait);drawPublicationFrame(ctx,W,H,accent);
  if(portrait){
    ctx.fillStyle='rgba(243,238,228,.46)';ctx.font='700 11px ui-monospace, Menlo, monospace';ctx.fillText('IDENTITY / ISSUE 01',70,164);
    drawCanonicalPublishedPlate(ctx,data,{x:90,y:315,w:900,h:660},accent);
    drawPublishedSignalRail(ctx,data,72,1045,W-144,accent);
    ctx.fillStyle='rgba(243,238,228,.40)';ctx.font='700 10px ui-monospace, Menlo, monospace';ctx.fillText('CORE LINE / PUBLIC',70,1320);
    ctx.fillStyle='rgba(243,238,228,.88)';ctx.font='600 31px "Noto Sans TC","PingFang TC",Arial,sans-serif';
    wrapText(ctx,data.hook,W-140).slice(0,2).forEach((line,i)=>ctx.fillText(line,70,1378+i*48));
    ctx.strokeStyle='rgba(243,238,228,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(70,1535);ctx.lineTo(W-70,1535);ctx.stroke();
    ctx.fillStyle='rgba(243,238,228,.42)';ctx.font='650 11px ui-monospace, Menlo, monospace';ctx.fillText('18 DECISIONS / SEALED',70,H-112);ctx.textAlign='right';ctx.fillText('STANDARD V1 / PUBLIC ARTIFACT',W-70,H-112);ctx.textAlign='left';
  }else{
    drawCanonicalPublishedPlate(ctx,data,{x:96,y:205,w:888,h:620},accent);
    drawPublishedSignalRail(ctx,data,72,880,W-144,accent);
    ctx.fillStyle='rgba(243,238,228,.40)';ctx.font='700 10px ui-monospace, Menlo, monospace';ctx.fillText('CORE LINE / PUBLIC',72,1062);
    ctx.fillStyle='rgba(243,238,228,.88)';ctx.font='600 28px "Noto Sans TC","PingFang TC",Arial,sans-serif';
    wrapText(ctx,data.hook,W-144).slice(0,2).forEach((line,i)=>ctx.fillText(line,72,1116+i*42));
    ctx.fillStyle='rgba(243,238,228,.42)';ctx.font='650 10px ui-monospace, Menlo, monospace';ctx.fillText('18 DECISIONS / SEALED',72,H-84);ctx.textAlign='right';ctx.fillText('STANDARD V1 / PUBLIC ARTIFACT',W-72,H-84);ctx.textAlign='left';
  }
  return canvas;
}
async function blobFrom(canvas){return await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(new Error('PNG encode failed')),'image/png',1))}
async function build(format='4:5'){
  const studio=document.querySelector('.v3-share-studio');
  if(!studio)return null;
  studio.dataset.format=format;
  studio.querySelectorAll('[data-share-format]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.shareFormat===format));
  const stage=studio.querySelector('.v3-share-stage');stage?.setAttribute('aria-busy','true');
  try{
    const canvas=render(format),blob=await blobFrom(canvas);
    if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl=URL.createObjectURL(blob);
    const img=stage?.querySelector('img');
    if(img){img.src=activeUrl;img.alt=`Trader DNA ${window.TraderDNAShareCard?.data?.()?.code||''} ${format} 身份卡`}
    stage?.classList.add('is-ready');stage?.removeAttribute('aria-busy');
    studio._shareBlob=blob;studio._shareFormat=format;
    return {blob,url:activeUrl,canvas};
  }catch(error){stage?.removeAttribute('aria-busy');if(stage)stage.dataset.error=error.message;throw error}
}
async function share(){
  const studio=document.querySelector('.v3-share-studio');if(!studio)return;
  if(!studio._shareBlob)await build(studio.dataset.format||'4:5');
  const data=window.TraderDNAShareCard?.data?.(),format=studio._shareFormat||'4:5';
  const file=new File([studio._shareBlob],`82TRADE-TraderDNA-${data?.code||'SCAN01'}-${format.replace(':','x')}.png`,{type:'image/png'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:`${data?.code||''} · ${data?.name||'Trader DNA'}`,text:'82TRADE / Trader DNA'});return}catch(error){if(error?.name==='AbortError')return}
  }
  const a=document.createElement('a');a.href=activeUrl;a.download=file.name;a.rel='noopener';a.click();
}
function intercept(event){
  const target=event.target?.closest?.('[data-share-format],.v3-share-generate,.v3-share-native');
  if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();
  const studio=document.querySelector('.v3-share-studio');
  const format=studio?.dataset.format||'4:5';
  if(target.matches('[data-share-format]')){
    build(target.dataset.shareFormat);
    return;
  }
  const publish=window.TraderDNAPublish;
  if(target.matches('.v3-share-native')){
    if(publish?.isPublished?.())share();
    else if(typeof publish?.start==='function'&&publish.start(format,{shareAfter:true})!==false){}
    else share();
    return;
  }
  if(typeof publish?.start==='function'&&publish.start(format)!==false)return;
  build(format);
}
let autoQueued=false;
function autoBuild(){
  const studio=document.querySelector('.v3-share-studio');
  if(!studio||studio.dataset.v46Auto==='1'||!window.TraderDNAShareCard?.data?.())return;
  studio.dataset.v46Auto='1';
  requestAnimationFrame(()=>build(studio.dataset.format||'4:5').catch(()=>{studio.dataset.v46Auto='0'}));
}
function install(){
  const api=window.TraderDNAShareCard;if(!api?.data)return requestAnimationFrame(install);
  window.TraderDNAShareCard={...api,render,build,share};
  document.addEventListener('click',intercept,true);
  new MutationObserver(()=>{if(!autoQueued){autoQueued=true;requestAnimationFrame(()=>{autoQueued=false;autoBuild()})}}).observe(document.querySelector('#view')||document.body,{childList:true,subtree:true});
  autoBuild();
}
addEventListener('beforeunload',()=>{if(activeUrl)URL.revokeObjectURL(activeUrl)});
install();
})();
