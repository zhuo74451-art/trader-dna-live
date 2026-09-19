(()=>{'use strict';
  document.documentElement.dataset.v5Director='functional-preview';
  const view=document.querySelector('#view');
  if(!view)return;
  const sync=()=>{
    const scene=view.querySelector('.hero')?'opening':view.querySelector('.quiz-wrap')?'quiz':view.querySelector('.reveal')?'reveal':view.querySelector('.result')?'result':'loading';
    document.body.dataset.v5Scene=scene;
  };
  new MutationObserver(sync).observe(view,{childList:true,subtree:true});
  sync();
})();