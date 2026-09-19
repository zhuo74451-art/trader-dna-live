(()=>{'use strict';
  document.documentElement.dataset.v5Director='functional-preview';
  const view=document.querySelector('#view');
  if(!view)return;

  let lastPublishState='';
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sync=()=>{
    const scene=view.querySelector('.hero')?'opening':view.querySelector('.quiz-wrap')?'quiz':view.querySelector('.reveal')?'reveal':view.querySelector('.result')?'result':'loading';
    document.body.dataset.v5Scene=scene;

    const qText=view.querySelector('.question-index')?.textContent?.trim()||'';
    const qNum=Number(qText.replace(/\D/g,''))||0;
    if(scene==='quiz'&&qNum){
      document.body.dataset.v5Question=String(qNum).padStart(2,'0');
      document.body.dataset.v5Beat=qNum<=6?'forming':qNum<=9?'pressure-a':qNum<=12?'pressure-b':qNum<=17?'lock':'final';
    }else{
      delete document.body.dataset.v5Question;
      delete document.body.dataset.v5Beat;
    }

    const studio=view.querySelector('.v3-share-studio');
    const publishState=studio?.dataset.v48Publish||'';
    if(publishState&&publishState!==lastPublishState){
      lastPublishState=publishState;
      if(publishState==='published'){
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          studio.scrollIntoView({block:'start',inline:'nearest',behavior:reduced()?'auto':'smooth'});
        }));
      }
    }
  };

  new MutationObserver(sync).observe(view,{childList:true,subtree:true,attributes:true,attributeFilter:['data-v48-publish']});
  sync();
})();