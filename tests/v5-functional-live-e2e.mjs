import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.TRADER_DNA_BASE_URL||'http://127.0.0.1:4174';
const out=process.env.TRADER_DNA_E2E_OUT||'e2e-v5';
await fs.mkdir(out,{recursive:true});
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const errors=[];
  const criticalResponses=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',response=>{
    if(response.status()<400)return;
    const url=response.url();
    if(/\/(app|event-persistence|visual-v3|visual-v4|director-v5-live)\.(js|css)$/.test(url)||/\/data\/(questions-[123]|types)\.json$/.test(url)){
      criticalResponses.push(`${response.status()} ${url}`);
    }
  });

  await page.goto(`${base}/v5/`,{waitUntil:'networkidle'});
  await page.locator('#start').waitFor({state:'visible'});
  assert(await page.locator('.v4-landing-specimen').count()===1,'V5 must reuse the real V4.8 landing specimen');
  assert(await page.locator('#start').isEnabled(),'real start control must remain enabled');
  const openingBoxes=await page.evaluate(()=>{
    const box=sel=>{const r=document.querySelector(sel)?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null};
    return {title:box('.hero h1'),copy:box('.hero-copy'),cta:box('.hero .cta'),plate:box('.v3-hero-material')};
  });
  assert(openingBoxes.title&&openingBoxes.copy&&openingBoxes.cta&&openingBoxes.plate,'opening composition boxes must exist');
  assert(openingBoxes.title.bottom+24<=openingBoxes.copy.top,`opening title/copy overlap: ${JSON.stringify(openingBoxes)}`);
  assert(openingBoxes.copy.bottom+10<=openingBoxes.cta.top,`opening copy/CTA overlap: ${JSON.stringify(openingBoxes)}`);
  assert(openingBoxes.plate.left>=-2&&openingBoxes.plate.right<=1442,`opening Plate must stay visually inside desktop viewport: ${JSON.stringify(openingBoxes.plate)}`);
  await page.screenshot({path:`${out}/v5-opening-1440.png`,fullPage:false});

  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('.question-index')?.textContent?.trim()==='Q01');
  assert(await page.locator('.option').count()===2,'Q01 must expose the real two-option product flow');
  assert(await page.locator('.v4-weave-panel').count()===1,'V5 must reuse the real V4.8 live Plate');
  assert(await page.locator('body').getAttribute('data-v5-beat')==='forming','Q01 must begin in the FORMING director beat');
  await page.screenshot({path:`${out}/v5-q01-forming-1440.png`,fullPage:false});
  await page.locator('.option[data-choice="A"]').click();
  await page.waitForFunction(()=>document.querySelector('.question-index')?.textContent?.trim()==='Q02',{timeout:2000});

  for(let q=2;q<=18;q++){
    if([6,9,12,13,17,18].includes(q)){
      if(q===13){
        await page.waitForFunction(()=>!document.querySelector('.v48-lock-occluder'),{timeout:1800});
      }
      const expectedBeat=q<=6?'forming':q<=9?'pressure-a':q<=12?'pressure-b':q<=17?'lock':'final';
      assert(await page.locator('body').getAttribute('data-v5-beat')===expectedBeat,`Q${q} director beat mismatch`);
      await page.screenshot({path:`${out}/v5-q${String(q).padStart(2,'0')}-${expectedBeat}-1440.png`,fullPage:false});
    }
    const choice=q%2===0?'B':'A';
    await page.locator(`.option[data-choice="${choice}"]`).click();
    if(q<18){
      await page.waitForFunction(expected=>document.querySelector('.question-index')?.textContent?.trim()===expected,`Q${String(q+1).padStart(2,'0')}`,{timeout:2200});
    }
  }

  await page.locator('.reveal').waitFor({state:'attached',timeout:2500});
  await page.locator('.v4-reveal-source').waitFor({state:'attached',timeout:2500});
  const revealChrome=await page.evaluate(()=>({topbarHeight:document.querySelector('.topbar')?.getBoundingClientRect().height||0,revealHeight:document.querySelector('.reveal')?.getBoundingClientRect().height||0,viewport:innerHeight}));
  assert(revealChrome.topbarHeight<=1,`Q18 reveal must retire ordinary topbar chrome: ${JSON.stringify(revealChrome)}`);
  assert(revealChrome.revealHeight>=revealChrome.viewport-2,`Q18 reveal must own the viewport: ${JSON.stringify(revealChrome)}`);
  assert(await page.locator('.v4-reveal-source .v4-node.is-committed').count()===18,'Q18 reveal must preserve all 18 decisions');
  await page.screenshot({path:`${out}/v5-q18-reveal-1440.png`,fullPage:false});

  await page.locator('.result').waitFor({state:'attached',timeout:6000});
  await page.waitForFunction(()=>document.querySelector('.result')?.dataset.v4Ready==='1',{timeout:5000});
  assert(await page.locator('.v47-identity-stack').count()===1,'Result must reuse the V4.8 issued-identity stack');
  assert(await page.locator('.v4-result-mark').count()===1,'Result must reuse the same issued Plate object');
  const resultFrame=await page.locator('.result').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,viewport:innerWidth}});
  assert(resultFrame.left<=1&&resultFrame.right>=resultFrame.viewport-1,`issued Result must own full viewport width: ${JSON.stringify(resultFrame)}`);
  const duplicate=await page.locator('.result-hero > .code').evaluate(el=>getComputedStyle(el).opacity);
  assert(Number(duplicate)===0,'V5 Result must demote duplicate outside-Plate DNA code');
  await page.screenshot({path:`${out}/v5-issued-1440.png`,fullPage:false});

  const dossierShots=[
    ['.v3-signal-strip','v5-dossier-signals-1440.png'],
    ['.v3-decision-scenes','v5-dossier-scenes-1440.png'],
    ['.portrait-section','v5-dossier-portrait-1440.png'],
    ['.dims-section','v5-dossier-dimensions-1440.png'],
    ['.v4-same-type','v5-dossier-people-1440.png'],
    ['.reminder','v5-dossier-private-1440.png']
  ];
  for(const [selector,file] of dossierShots){
    const section=page.locator(selector);
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(180);
    await page.screenshot({path:`${out}/${file}`,fullPage:false});
  }

  const publish=page.locator('.v3-share-generate');
  await publish.scrollIntoViewIfNeeded();
  await publish.click();
  await page.waitForFunction(()=>document.querySelector('.v3-share-studio')?.dataset.v48Publish==='published',{timeout:5000});
  await page.waitForTimeout(650);
  assert(await page.locator('.v3-share-stage img').getAttribute('src'),'real V4.8 publish renderer must produce the artifact image');
  const publishedFrame=await page.evaluate(()=>{
    const stage=document.querySelector('.v3-share-stage')?.getBoundingClientRect();
    const h3=document.querySelector('.v3-share-studio-copy h3');
    return {stage:stage?{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom,width:stage.width,height:stage.height}:null,h3Display:h3?getComputedStyle(h3).display:null};
  });
  assert(publishedFrame.stage,'published artifact stage must exist');
  const publishedCenter=(publishedFrame.stage.left+publishedFrame.stage.right)/2;
  assert(Math.abs(publishedCenter-720)<=28,`published artifact must own the center frame: ${JSON.stringify(publishedFrame)}`);
  assert(publishedFrame.stage.top>=58&&publishedFrame.stage.bottom<=890,`published artifact must fit the visible cinematic frame: ${JSON.stringify(publishedFrame)}`);
  assert(publishedFrame.h3Display==='none',`published frame must retire explanatory headline: ${JSON.stringify(publishedFrame)}`);
  await page.screenshot({path:`${out}/v5-published-1440.png`,fullPage:false});

  await page.setViewportSize({width:390,height:844});
  await page.goto(`${base}/v5/`,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  const mobileOpening=await page.evaluate(()=>{
    const box=sel=>{const r=document.querySelector(sel)?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null};
    return {title:box('.hero h1'),copy:box('.hero-copy'),cta:box('.hero .cta')};
  });
  assert(mobileOpening.title.bottom+14<=mobileOpening.copy.top,`mobile opening title/copy overlap: ${JSON.stringify(mobileOpening)}`);
  assert(mobileOpening.copy.bottom+8<=mobileOpening.cta.top,`mobile opening copy/CTA overlap: ${JSON.stringify(mobileOpening)}`);
  await page.screenshot({path:`${out}/v5-opening-390.png`,fullPage:false});
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('.question-index')?.textContent?.trim()==='Q01');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=1,`mobile V5 preview must not overflow horizontally: ${overflow}`);
  await page.locator('.option[data-choice="B"]').click();
  await page.waitForFunction(()=>document.querySelector('.question-index')?.textContent?.trim()==='Q02',{timeout:2000});
  await page.screenshot({path:`${out}/v5-q02-390.png`,fullPage:false});

  assert(errors.length===0,`page errors: ${errors.join(' | ')}`);
  assert(criticalResponses.length===0,`critical resource failures: ${criticalResponses.join(' | ')}`);
  console.log('V5_FUNCTIONAL_PREVIEW=PASS');
} finally {
  await browser.close();
}
