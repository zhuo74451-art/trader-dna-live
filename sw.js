const CACHE_NAME="trader-dna-event-2586bd0cc133eb71ab8847624445631c86c7533d";
const PRECACHE=[".","./index.html","./app.js","./event-persistence.js","./styles.css","./styles-responsive.css","./visual-v3.css","./visual-v3-motion.css","./visual-v3-polish.css","./visual-v3-refine.css","./visual-v3-result-depth.css","./visual-v4.css","./visual-v4-result.css","./visual-v3.js","./visual-v3-refine.js","./visual-v3-share-card.js","./visual-v4.js","./visual-v4-result.js","./data/questions-1.json","./data/questions-2.json","./data/questions-3.json","./data/types.json","./assets/portraits/warren-buffett.jpg","./assets/portraits/charles-darwin.jpg","./assets/portraits/charlie-munger.jpg","./assets/portraits/howard-marks.jpg","./assets/portraits/philip-fisher.svg","./assets/portraits/peter-thiel.jpg","./assets/portraits/marc-andreessen.jpg","./assets/portraits/paul-tudor-jones.jpg","./assets/portraits/chester-nimitz.jpg","./assets/portraits/stanley-druckenmiller.svg","./assets/portraits/jeff-bezos.jpg","./assets/portraits/jesse-livermore.svg","./assets/portraits/steve-jobs.jpg","./assets/portraits/nassim-nicholas-taleb.svg","./assets/portraits/george-soros.jpg","./assets/portraits/daniel-kahneman.svg","./assets/portraits/benjamin-graham.svg","./assets/portraits/michael-mauboussin.svg","./assets/portraits/peter-lynch.svg","./assets/portraits/li-lu.svg","./assets/portraits/dwight-eisenhower.jpg","./assets/portraits/marcus-aurelius.jpg","./assets/portraits/ed-seykota.svg","./assets/portraits/marie-curie.svg","./assets/portraits/jim-simons.jpg","./assets/portraits/edward-thorp.svg","./assets/portraits/jack-bogle.svg","./assets/portraits/elon-musk.jpg","./assets/portraits/david-tepper.svg","./assets/portraits/john-maynard-keynes.svg","./assets/portraits/john-d-rockefeller.svg","./assets/portraits/miyamoto-musashi.png","./data/portraits.json"];
const CACHE_PREFIX='trader-dna-event-';

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached) return cached;
    try{
      const response=await fetch(request);
      if(response&&response.ok){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(request,response.clone());
      }
      return response;
    }catch(error){
      if(request.mode==='navigate'){
        const fallback=await caches.match(new URL('./index.html',self.registration.scope).href,{ignoreSearch:true});
        if(fallback) return fallback;
      }
      throw error;
    }
  })());
});
