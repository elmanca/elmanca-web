// ============================================
// MANCA CUSTOM — YouTube RSS (gratis, sin API key) + Canal configurable
// ============================================
(function(){
  'use strict';
  const CFG = {
    canalLabel: 'Canal Oficial',
    subscriberCount: '1.290',
    videoCount: '116',
    youtubeChannel: '@elmancasg',
    youtubePlaylist: 'UU3woFJgJr1F8-55tU9Bxz3Q',
    debug: false
  };
  function log(...a){ if(CFG.debug) console.log('[MancaCustom]', ...a); }
  function $(s, c=document){ return c.querySelector(s); }
  function $$(s, c=document){ return Array.from(c.querySelectorAll(s)); }
  function fmtNum(n){
    n=String(n).replace(/\D/g,''); if(!n) return '0'; const num=parseInt(n,10);
    return num>=1000?(num/1000).toFixed(1).replace('.',',')+'K':num.toString();
  }
  async function fetchLatestVideosRSS(maxResults=6){
    try {
      const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${CFG.youtubePlaylist}`);
      if(!res.ok) throw new Error('RSS no disponible');
      const xml = new DOMParser().parseFromString(await res.text(), 'application/xml');
      const entries = xml.getElementsByTagName('entry');
      const videos = [];
      for(let i=0; i<entries.length && i<maxResults; i++){
        const e = entries[i];
        const titleEl = e.getElementsByTagName('title')[0];
        const linkEl = e.getElementsByTagName('link')[0];
        const thumbEls = e.getElementsByTagNameNS('http://search.yahoo.com/mrss/','thumbnail');
        const ytIdEls = e.getElementsByTagNameNS('http://www.youtube.com/xml/schemas/2015','videoId');
        let thumbnail='', videoId='';
        if(thumbEls.length>0) thumbnail = thumbEls[0].getAttribute('url')||'';
        if(ytIdEls.length>0) videoId = ytIdEls[0].textContent||'';
        if(!videoId && linkEl){ const m=(linkEl.getAttribute('href')||'').match(/[?&]v=([^&]+)/); if(m) videoId=m[1]; }
        if(!videoId) continue;
        videos.push({id:videoId, title: titleEl?titleEl.textContent:'Video de El Canal',
          thumbnail: thumbnail||`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`});
      }
      return videos;
    }catch(e){ log('Error RSS:', e); return []; }
  }
  function buildVideoCard(v, first=false){
    const imgCls = first?'w-full h-48 object-cover':'w-full h-40 object-cover';
    return `<div class="rounded-2xl overflow-hidden bg-[#070E20] border border-[#2A52BE]/30 hover:border-[#3870E0] transition-all flex flex-col shadow-md cursor-pointer" onclick="window.open('${v.url}','_blank')">
      <img src="${v.thumbnail}" alt="${v.title}" style="${imgCls};transition:transform .3s;">
      <div class="p-3 flex-1 flex flex-col justify-between bg-[#081228]">
        <div><h4 class="text-xs sm:text-sm font-bold text-white uppercase tracking-tight line-clamp-2 leading-snug mb-2">${v.title}</h4></div>
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-[#60A5FA] font-semibold uppercase tracking-wider">Ver en YouTube</span>
          <span class="text-[#94A3B8]">▶</span>
        </div>
      </div>
    </div>`;
  }
  async function updateCanalSection(){
    const texto = $$('*').find(el => {
      const t = el.textContent||'';
      return t.includes('suscriptores')||t.includes('@elmancasg')||t.includes('producciones');
    });
    if(texto){
      const parent = texto.closest('div,section,article')||texto.parentElement;
      if(parent){
        const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while(node = walker.nextNode()){
          if(node.textContent.includes('suscriptores')||node.textContent.includes('producciones')){
            node.textContent = node.textContent
              .replace(/\+\d[\d.,]*\s*suscriptores/i, `+${CFG.subscriberCount} suscriptores`)
              .replace(/\d[\d.,]*\s*producciones/i, `${CFG.videoCount} producciones`);
          }
        }
      }
    }
    const videos = await fetchLatestVideosRSS(6);
    if(videos.length===0){ log('No hay videos RSS'); return true; }
    const gridContainer = $$('div').find(el => {
      const cls = el.className||'';
      return cls.includes('grid-cols-1')&&cls.includes('grid-cols-2')&&cls.includes('grid-cols-3');
    });
    if(!gridContainer){ log('No se encontró grid de videos'); return true; }
    let html = buildVideoCard(videos[0], true);
    html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">';
    for(let i=1;i<videos.length;i++) html += buildVideoCard(videos[i], false);
    html += '</div>';
    gridContainer.innerHTML = html;
    log('Grid reemplazado con', videos.length, 'videos RSS');
    return true;
  }
  async function loadConfig(){
    try {
      const res = await fetch('/api/content.php');
      if(res.ok){
        const data = await res.json();
        const st = data.siteTexts||{};
        if(st.canalLabel) CFG.canalLabel = st.canalLabel;
        if(st.subscriberCount) CFG.subscriberCount = st.subscriberCount;
        if(st.videoCount) CFG.videoCount = st.videoCount;
        if(st.youtubeChannel) CFG.youtubeChannel = st.youtubeChannel;
        if(st.youtubePlaylist) CFG.youtubePlaylist = st.youtubePlaylist;
      }
    }catch(e){ log('Error config:', e); }
  }
  let initialized=false;
  async function init(){
    if(initialized) return;
    initialized=true;
    await loadConfig();
    let attempts=0;
    const maxAttempts=30;
    const tryUpdate = setInterval(async ()=>{
      attempts++;
      const ok = await updateCanalSection();
      if(ok || attempts>=maxAttempts){ clearInterval(tryUpdate); if(!ok) log('No se pudo actualizar canal tras', maxAttempts, 'intentos'); }
    }, 500);
    log('Manca Custom inicializado');
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();