(()=>{
'use strict';

const VERSION='standard-v1-2026-09';
const STORAGE_KEY=`82trade-trader-dna:${VERSION}`;
const REDUCED=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
const view=document.querySelector('#view');
let syncQueued=false;
let heroStop=null;
let revealStop=null;

function readState(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
}
function choices18(){
  const answers=readState()?.answers||{};
  return Array.from({length:18},(_,i)=>answers[i+1]||null);
}
function hexRgb(hex){
  const value=(hex||'#b8ff2c').trim().replace('#','');
  const h=value.length===3?value.split('').map(x=>x+x).join(''):value.padEnd(6,'0').slice(0,6);
  return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];
}
function seed01(i,seed=17){
  const x=Math.sin((i+1)*12.9898+seed*78.233)*43758.5453;
  return x-Math.floor(x);
}
function shader(gl,type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader compile failed');
  return s;
}
function program(gl,vs,fs){
  const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'program link failed');
  return p;
}
function fitCanvas(canvas,gl,maxDpr=1.65){
  const rect=canvas.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,maxDpr);
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
  return {w,h,dpr};
}

/*
  Material field adapted from React Bits LiquidChrome (MIT + Commons Clause).
  We keep the underlying product code independent and only reuse the shader idea.
  See THIRD_PARTY_NOTICES_VISUAL_V3.md.
*/
function startLiquid(canvas,{accent='#c8ff35',interactive=true}={}){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)return()=>{};
  const vs=`
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main(){vUv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}
  `;
  const fs=`
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform vec3 uAccent;
    varying vec2 vUv;

    vec3 field(vec2 uvCoord){
      vec2 frag=uvCoord*uResolution;
      vec2 uv=(2.0*frag-uResolution.xy)/min(uResolution.x,uResolution.y);
      float t=uTime*.34;
      for(float i=1.0;i<10.0;i++){
        uv.x += .22/i*cos(i*3.15*uv.y+t+uMouse.x*3.14159);
        uv.y += .20/i*cos(i*2.72*uv.x+t+uMouse.y*3.14159);
      }
      vec2 diff=uvCoord-uMouse;
      float dist=length(diff);
      float falloff=exp(-dist*13.0);
      float ripple=sin(15.0*dist-uTime*1.4)*.028;
      uv+=(diff/(dist+.0001))*ripple*falloff;
      float bands=1.0/max(.085,abs(sin(t*.72-uv.x*.92-uv.y*1.08)));
      bands=min(bands,7.5)/7.5;
      float spec=pow(bands,2.35);
      float edge=smoothstep(.12,.96,spec);
      vec3 steel=mix(vec3(.025,.028,.026),vec3(.86,.88,.82),spec*.74);
      vec3 tint=uAccent*(.08+.38*edge);
      return steel+tint;
    }
    void main(){
      vec3 c=field(vUv);
      float vignette=smoothstep(.82,.18,length(vUv-.5));
      float alpha=.96*mix(.78,1.0,vignette);
      gl_FragColor=vec4(c,alpha);
    }
  `;
  const p=program(gl,vs,fs);gl.useProgram(p);
  const pos=gl.getAttribLocation(p,'aPosition');
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const uTime=gl.getUniformLocation(p,'uTime'),uResolution=gl.getUniformLocation(p,'uResolution'),uMouse=gl.getUniformLocation(p,'uMouse'),uAccent=gl.getUniformLocation(p,'uAccent');
  const rgb=hexRgb(accent);gl.uniform3f(uAccent,rgb[0],rgb[1],rgb[2]);
  let mouse=[.58,.42],raf=0,dead=false,last=0;
  const target=canvas.parentElement||canvas;
  const move=(event)=>{
    const point=event.touches?.[0]||event;
    const r=target.getBoundingClientRect();
    if(!r.width||!r.height)return;
    mouse=[Math.max(0,Math.min(1,(point.clientX-r.left)/r.width)),1-Math.max(0,Math.min(1,(point.clientY-r.top)/r.height))];
  };
  if(interactive&&!REDUCED){target.addEventListener('pointermove',move,{passive:true});target.addEventListener('touchmove',move,{passive:true})}
  function frame(now){
    if(dead)return;
    const {w,h}=fitCanvas(canvas,gl);
    gl.useProgram(p);gl.uniform1f(uTime,REDUCED?1.25:now*.001);gl.uniform2f(uResolution,w,h);gl.uniform2f(uMouse,mouse[0],mouse[1]);
    gl.drawArrays(gl.TRIANGLES,0,3);
    last=now;raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return()=>{
    dead=true;cancelAnimationFrame(raf);
    if(interactive&&!REDUCED){target.removeEventListener('pointermove',move);target.removeEventListener('touchmove',move)}
    gl.deleteBuffer(buf);gl.deleteProgram(p);gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

function vectorStrip(choices,{compact=false}={}){
  const marks=choices.map((choice,i)=>`<i class="v3-vector-mark ${choice?`is-${choice.toLowerCase()}`:'is-empty'}" style="--i:${i}"></i>`).join('');
  return `<div class="v3-vector ${compact?'is-compact':''}">${marks}</div>`;
}

function mountLanding(){
  const hero=view.querySelector('.hero');
  const object=view.querySelector('.hero-object');
  if(!hero||!object||object.querySelector('.v3-hero-material'))return;
  object.querySelector('.register-frame')?.setAttribute('hidden','');
  object.insertAdjacentHTML('afterbegin',`
    <div class="v3-hero-material" aria-hidden="true">
      <div class="v4-material-side"></div>
      <div class="v4-material-bottom"></div>
      <canvas class="v3-liquid"></canvas>
      <div class="v3-object-edge"></div>
      <div class="v3-object-label"><span>SCAN 01</span><b>18 / 06 / 01</b></div>
      <div class="v3-object-word">IDENTITY<br>UNDER<br>PRESSURE</div>
      <div class="v3-object-vector">${vectorStrip(Array.from({length:18},(_,i)=>i%3===0?'A':i%4===0?'B':null),{compact:true})}</div>
      <div class="v4-material-id">TRD / IDENTITY PLATE / 001</div>
    </div>`);
  heroStop?.();heroStop=startLiquid(object.querySelector('.v3-liquid'),{accent:'#c8ff35'});
  const material=object.querySelector('.v3-hero-material');
  if(!REDUCED){
    const tilt=(event)=>{
      const point=event.touches?.[0]||event,r=material.getBoundingClientRect();
      const x=((point.clientX-r.left)/r.width-.5),y=((point.clientY-r.top)/r.height-.5);
      const cinematic=Boolean(material.querySelector('.v4-landing-specimen'));
      const mx=cinematic?3.1:7.5,my=cinematic?2.2:5.5;
      material.style.setProperty('--tilt-x',`${(-y*my).toFixed(2)}deg`);
      material.style.setProperty('--tilt-y',`${(x*mx).toFixed(2)}deg`);
    };
    const reset=()=>{material.style.setProperty('--tilt-x','0deg');material.style.setProperty('--tilt-y','0deg')};
    material.addEventListener('pointermove',tilt,{passive:true});
    material.addEventListener('pointerleave',reset,{passive:true});
  }
}

function mountQuestion(){
  const wrap=view.querySelector('.quiz-wrap');
  if(!wrap||wrap.querySelector('.v3-answer-vector'))return;
  const state=readState();
  const visible=(state?.mode==='quick')||(state?.mode==='full'&&Number(state.index||0)<18);
  if(!visible)return;
  const choices=choices18(),count=choices.filter(Boolean).length;
  const el=document.createElement('div');el.className='v3-answer-vector';
  el.innerHTML=`<div class="v3-vector-meta"><span>DECISION VECTOR</span><b>${String(count).padStart(2,'0')} / 18</b></div>${vectorStrip(choices)}`;
  wrap.querySelector('.bar')?.insertAdjacentElement('afterend',el);
}

function targetTextPoints(code,count,aspect){
  const w=1200,h=380,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.textAlign='center';ctx.font='900 250px Arial Black, Arial, sans-serif';ctx.fillText(code,w/2,h/2+6);
  const data=ctx.getImageData(0,0,w,h).data,candidates=[];
  for(let y=8;y<h-8;y+=3)for(let x=8;x<w-8;x+=3){if(data[(y*w+x)*4+3]>80)candidates.push([x,y])}
  const out=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const p=candidates[(i*97)%Math.max(1,candidates.length)]||[w/2,h/2];
    out[i*3]=((p[0]/w)-.5)*1.62;
    out[i*3+1]=(.5-p[1]/h)*.54-.04;
    out[i*3+2]=(seed01(i,71)-.5)*.06;
  }
  return out;
}
function sourceBandPoints(choices,count){
  const out=new Float32Array(count*3),seed=choices.reduce((s,c,i)=>s+(c==='A'?i+11:(i+11)*2),37);
  for(let i=0;i<count;i++){
    const band=i%18,choice=choices[band]||'A',t=seed01(i,seed),j=(seed01(i+41,seed)-.5);
    let x=-.82+t*1.64;
    let y=(band-8.5)*.047+(choice==='A'?.024:-.024)+Math.sin(t*6.283+band*.7)*.014+j*.012;
    const angle=-.11;
    const rx=x*Math.cos(angle)-y*Math.sin(angle),ry=x*Math.sin(angle)+y*Math.cos(angle);
    out[i*3]=rx;out[i*3+1]=ry;out[i*3+2]=(band-8.5)*.015+j*.05;
  }
  return out;
}
function randomSeeds(count,seed=19){
  const out=new Float32Array(count*2);
  for(let i=0;i<count;i++){out[i*2]=seed01(i,seed);out[i*2+1]=seed01(i+719,seed)}
  return out;
}

function startParticleMorph(canvas,choices,code,accent){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)return()=>{};
  const count=window.innerWidth<480?3600:5200;
  const vs=`
    precision highp float;
    attribute vec3 aSource;
    attribute vec3 aTarget;
    attribute vec2 aSeed;
    uniform float uProgress;
    uniform float uTime;
    uniform float uDpr;
    uniform float uAspect;
    varying float vLife;
    varying float vAccent;
    float ease(float x){return x<.5?4.0*x*x*x:1.0-pow(-2.0*x+2.0,3.0)/2.0;}
    void main(){
      float p=clamp(uProgress,0.0,1.0);
      float local=clamp((p-aSeed.x*.07)/.93,0.0,1.0);
      vec3 s=aSource,t=aTarget;
      float ang=aSeed.x*6.28318+uTime*.18;
      float radius=.35+aSeed.y*.75;
      vec3 burst=vec3(cos(ang)*radius,sin(ang)*radius*.72,(aSeed.y-.5)*1.7);
      vec3 mid=normalize(s+vec3(.0001))*mix(.25,.72,aSeed.x)+burst;
      vec3 pos;
      if(local<.47){float k=ease(local/.47);pos=mix(s,mid,k);}else{float k=ease((local-.47)/.53);pos=mix(mid,t,k);}
      float spin=sin(clamp((p-.12)/.68,0.0,1.0)*3.14159)*.55;
      float cs=cos(spin),sn=sin(spin);
      pos.xz=mat2(cs,-sn,sn,cs)*pos.xz;
      float perspective=1.0/(1.18-pos.z*.23);
      vec2 clip=vec2(pos.x/max(.72,uAspect*.74),pos.y)*perspective;
      gl_Position=vec4(clip,0.0,1.0);
      float settle=smoothstep(.62,.94,p);
      gl_PointSize=mix(1.35,2.55,1.0-aSeed.x)*uDpr*mix(1.0,1.2,settle)*perspective;
      vLife=1.0-smoothstep(.965,1.0,p);
      vAccent=step(.73,aSeed.y);
    }
  `;
  const fs=`
    precision highp float;
    uniform vec3 uAccent;
    varying float vLife;
    varying float vAccent;
    void main(){
      vec2 p=gl_PointCoord-.5;float d=dot(p,p);if(d>.25)discard;
      float alpha=(1.0-smoothstep(.06,.25,d))*vLife;
      vec3 paper=vec3(.94,.92,.86);
      vec3 color=mix(paper,uAccent,vAccent*.72);
      gl_FragColor=vec4(color,alpha*.92);
    }
  `;
  const p=program(gl,vs,fs);gl.useProgram(p);
  const source=sourceBandPoints(choices,count),target=targetTextPoints(code,count,1),seeds=randomSeeds(count,choices.reduce((s,c,i)=>s+(c==='A'?i+3:(i+3)*2),17));
  function attrib(name,size,data){const loc=gl.getAttribLocation(p,name),b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);return b}
  const buffers=[attrib('aSource',3,source),attrib('aTarget',3,target),attrib('aSeed',2,seeds)];
  const uProgress=gl.getUniformLocation(p,'uProgress'),uTime=gl.getUniformLocation(p,'uTime'),uDpr=gl.getUniformLocation(p,'uDpr'),uAspect=gl.getUniformLocation(p,'uAspect'),uAccent=gl.getUniformLocation(p,'uAccent');
  const rgb=hexRgb(accent);gl.uniform3f(uAccent,rgb[0],rgb[1],rgb[2]);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  let raf=0,dead=false,start=performance.now();
  function frame(now){
    if(dead)return;const {w,h,dpr}=fitCanvas(canvas,gl,1.45),elapsed=now-start;
    const progress=REDUCED?1:Math.min(1,elapsed/2450);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(p);
    gl.uniform1f(uProgress,progress);gl.uniform1f(uTime,elapsed*.001);gl.uniform1f(uDpr,dpr);gl.uniform1f(uAspect,w/h);
    gl.drawArrays(gl.POINTS,0,count);
    if(progress<1)raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return()=>{dead=true;cancelAnimationFrame(raf);buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteProgram(p);gl.getExtension('WEBGL_lose_context')?.loseContext()};
}

function mountReveal(){
  const reveal=view.querySelector('.reveal');
  if(!reveal||reveal.querySelector('.v3-reveal-stage'))return;
  const code=(reveal.querySelector('.reveal-code')?.textContent||'').trim(),accent=getComputedStyle(reveal).getPropertyValue('--tc').trim()||'#c8ff35',choices=choices18();
  reveal.insertAdjacentHTML('afterbegin',`
    <div class="v3-reveal-stage" aria-hidden="true">
      <div class="v3-reveal-grid"></div>
      <canvas class="v3-morph"></canvas>
      <div class="v3-impact"></div>
      <div class="v3-reveal-caption"><span>18 INPUTS LOCKED</span><b>IDENTITY MATERIAL / COLLAPSING</b></div>
    </div>`);
  revealStop?.();
  if(!REDUCED)revealStop=startParticleMorph(reveal.querySelector('.v3-morph'),choices,code,accent);
  try{navigator.vibrate?.([8,28,12])}catch{}
}

function mountResult(){
  const hero=view.querySelector('.result-hero');
  if(!hero||hero.querySelector('.v3-result-artifact'))return;
  const choices=choices18(),bars=choices.map((choice,i)=>`<i class="${choice?`is-${choice.toLowerCase()}`:'is-empty'}" style="--i:${i}"></i>`).join('');
  hero.insertAdjacentHTML('beforeend',`
    <div class="v3-result-artifact" aria-hidden="true">
      <div class="v3-issued-label"><span>ISSUED / 82TRADE</span><b>18 DECISIONS</b></div>
      <div class="v3-issued-bars">${bars}</div>
      <div class="v3-issued-cut"></div>
    </div>`);
}

function sync(){
  syncQueued=false;
  if(view.querySelector('.hero'))mountLanding();else{heroStop?.();heroStop=null}
  if(view.querySelector('.quiz-wrap'))mountQuestion();
  if(view.querySelector('.reveal'))mountReveal();else{revealStop?.();revealStop=null}
  if(view.querySelector('.result'))mountResult();
}
function queueSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(sync)}

new MutationObserver(queueSync).observe(view,{childList:true,subtree:true});
document.addEventListener('click',event=>{if(event.target.closest?.('.option'))requestAnimationFrame(queueSync)},{passive:true});
queueSync();
})();
