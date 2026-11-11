// ============================================
// MANCA CUSTOM — Inyección post-carga del bundle
// ============================================
(function(){
  'use strict';
  const CFG = {
    youtubeApiKey: '',
    youtubeChannel: '@elmancasg',
    youtubePlaylist: 'UU3woFJgJr1F8-55tU9Bxz3Q',
    subscriberCount: '1.290',
    videoCount: '116',
    debug: false
  };
  function log(...a){ if(CFG.debug) console.log('[MancaCustom]', ...a); }
  function $(sel, ctx=document){ return ctx.querySelector(sel); }
  function $$(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }
  async function fetchYouTubeStats(){
    if(!CFG.youtubeApiKey){
      log('No hay YouTube API key, usando valores estáticos');
      return {subs: CFG.subscriberCount, videos: CFG.videoCount};
    }
    try {
      const handle = CFG.youtubeChannel.replace('@','');
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${handle}&key=${CFG.youtubeApiKey}`);
      const data = await res.json();
      if(data.items && data.items[0]){
        const s = data.items[0].statistics;
        return {subs: fmtNumber(s.subscriberCount || '0'), videos: fmtNumber(s.videoCount || '0')};
      }
    } catch(e){ log('Error fetching YouTube stats:', e); }
    return {subs: CFG.subscriberCount, videos: CFG.videoCount};
  }

  async function fetchLatestVideos(maxResults=6){
    if(!CFG.youtubeApiKey){ return []; }
    try {
      const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${CFG.youtubeChannel.replace('@','')}&key=${CFG.youtubeApiKey}`);
      const chData = await chRes.json();
      if(!chData.items || !chData.items[0]) return [];
  const lightboxHTML = `
    <div id="manca-lightbox" style="
      position:fixed; inset:0; z-index:999999;
      background:rgba(0,0,0,0.9); display:none; align-items:center; justify-content:center;
      padding:1rem; backdrop-filter:blur(4px);
    ">
      <button id="manca-lightbox-close" style="
        position:absolute; top:1rem; right:1rem; z-index:1000001;
        background:#3870E0; border:none; color:#fff; width:48px; height:48px;
        border-radius:50%; cursor:pointer; font-size:24px; line-height:1; display:flex; align-items:center; justify-content:center;
      ">×</button>
      <img id="manca-lightbox-img" src="" style="max-width:90vw; max-height:85vh; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div id="manca-lightbox-caption" style="color:#fff; margin-top:1rem; text-align:center; font-size:1.1rem;"></div>
    </div>
    <style>
      #manca-lightbox img { transition: transform 0.3s ease; }
      #manca-lightbox img:hover { transform: scale(1.02); cursor: zoom-out; }
      .manca-draggable { cursor: grab; }
      .manca-draggable:active { cursor: grabbing; }
    </style>
  `;

  function initLightbox(){
    if($('#manca-lightbox')) return;
    document.insertAdjacentHTML('beforeend', lightboxHTML);
    const lb = $('#manca-lightbox');
    const close = $('#manca-lightbox-close');
    const img = $('#manca-lightbox-img');
    const cap = $('#manca-lightbox-caption');

    function open(src, caption){
      img.src = src;
      cap.textContent = caption || '';
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    function closeLb(){
      lb.style.display = 'none';
      document.body.style.overflow = '';
      img.src = '';
    }

    close.onclick = closeLb;
    lb.onclick = (e)=>{ if(e.target===lb) closeLb(); };
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLb(); });

    return { open };
  }

  const lightbox = initLightbox();
  function initCarousel(container){
    if(container.dataset.mancaCarousel) return;
    container.dataset.mancaCarousel = '1';

    const slider = container.querySelector(':scope > div') || container;
    if(!slider) return;

    $$('img', slider).forEach(img => {
      makeImageClickable(img, img.alt || '');
    });

    let isDown = false;
    let startX;
    let scrollLeft;

    container.classList.add('manca-draggable');

    const start = (e)=>{
      isDown = true;
      container.classList.add('active');
      startX = e.pageX || (e.touches && e.touches[0] ? e.touches[0].pageX : 0);
      scrollLeft = container.scrollLeft;
    };
    const move = (e)=>{
      if(!isDown) return;
      e.preventDefault();
      const x = e.pageX || (e.touches && e.touches[0] ? e.touches[0].pageX : 0);
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    };
    const end = ()=>{
      isDown = false;
      container.classList.remove('active');
    };

    container.addEventListener('mousedown', start);
    container.addEventListener('touchstart', start, {passive:false});
    container.addEventListener('mousemove', move);
    container.addEventListener('touchmove', move, {passive:false});
    container.addEventListener('mouseup', end);
    container.addEventListener('mouseleave', end);
    container.addEventListener('touchend', end);

    const prev = container.querySelector('[aria-label*="prev"],[aria-label*="anterior"],.carousel-prev,[data-manca-carousel-prev]');
    const next = container.querySelector('[aria-label*="next"],[aria-label*="siguiente"],.carousel-next,[data-manca-carousel-next]');
    if(prev) prev.addEventListener('click', ()=>{ container.scrollBy({left:-300, behavior:'smooth'}); });
    if(next) next.addEventListener('click', ()=>{ container.scrollBy({left:300, behavior:'smooth'}); });

    log('Carrusel inicializado:', container);
  }

  function findCarousels(){
    const candidates = $$('[style*="overflow-x-auto"], [class*="overflow-x-auto"]');
    return candidates.filter(el => {
      return el.querySelector('img') !== null ||
  async function updateCanalSection(){
    const texto = $$('*').find(el => {
      const t = el.textContent || '';
      return t.includes('suscriptores') || t.includes('@elmancasg') || t.includes('producciones');
    });

    if(!texto){
      log('No se encontró la sección de El Canal aún');
      return false;
    }

    const stats = await fetchYouTubeStats();
    const parent = texto.closest('div, section, article') || texto.parentElement;
    if(parent){
      const newText = `@elmancasg • ${stats.subs} suscriptores • ${stats.videos} producciones`;
      const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while(node = walker.nextNode()){
        if(node.textContent.includes('suscriptores') || node.textContent.includes('producciones')){
          node.textContent = node.textContent
            .replace(/\+\d[\d.,]*\s*suscriptores/i, `+${stats.subs} suscriptores`)
            .replace(/\d[\d.,]*\s*producciones/i, `${stats.videos} producciones`);
        }
      }
      log('Contadores actualizados:', newText);
    }

    if(CFG.youtubeApiKey){
      const videos = await fetchLatestVideos(6);
      if(videos.length > 0){
        renderLatestVideos(videos);
      }
    }

    return true;
  }

  function renderLatestVideos(videos){
    const ytContainer = $$('section, div').find(el => {
      const html = el.innerHTML || '';
      return html.includes('youtube.com/embed') || html.includes('youtube.com/watch');
    });

    if(!ytContainer){
      log('No se encontró contenedor de videos para inyectar últimos videos');
  let initialized = false;
  async function init(){
    if(initialized) return;
    initialized = true;

    await loadConfig();

    let attempts = 0;
    const maxAttempts = 30;
    const tryUpdate = setInterval(async ()=>{
      attempts++;
      const ok = await updateCanalSection();
      if(ok || attempts >= maxAttempts){
        clearInterval(tryUpdate);
        if(!ok) log('No se pudo actualizar la sección de El Canal después de', maxAttempts, 'intentos');
      }
    }, 500);

    let carruselAttempts = 0;
    const tryCarousels = setInterval(()=>{
      carruselAttempts++;
      const carrusels = findCarousels();
      if(carrusels.length > 0 || carruselAttempts >= 20){
        clearInterval(tryCarousels);
        carrusels.forEach(initCarousel);
        log('Carruseles encontrados:', carrusels.length);
      }
    }, 500);

    const observer = new MutationObserver((mutations)=>{
      for(const m of mutations){
        for(const node of m.addedNodes){
          if(node.nodeType===1 && node.querySelectorAll){
            const found = node.querySelectorAll('[style*="overflow-x-auto"], [class*="overflow-x-auto"]');
            found.forEach(el=>{
              if(el.querySelector('img') && !el.dataset.mancaCarousel) initCarousel(el);
            });
            if(node.matches && node.matches('[style*="overflow-x-auto"], [class*="overflow-x-auto"]') && !node.dataset.mancaCarousel){
              if(node.querySelector('img')) initCarousel(node);
            }
          }
        }
      }
    });
    observer.observe(document.body, {childList:true, subtree:true});

    log('Manca Custom inicializado');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
      return;
    }

    const videosHTML = `
      <div style="margin-top:2rem;">
        <h3 style="color:#fff; font-size:1.25rem; margin-bottom:1rem;">Últimos videos de El Canal</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:1rem;">
          ${videos.map(v => `
            <div style="background:#0E1E44; border:1px solid #2A52BE; border-radius:12px; overflow-hidden; cursor:pointer;" onclick="window.open('${v.url}', '_blank')">
              <img src="${v.thumbnail}" alt="${v.title}" style="width:100%; height:180px; object-fit:cover; display:block;">
              <div style="padding:1rem;">
                <div style="color:#fff; font-weight:bold; font-size:0.95rem; margin-bottom:0.5rem;">${v.title}</div>
                <a href="${v.url}" target="_blank" style="color:#3870E0; text-decoration:none; font-size:0.85rem;">Ver en YouTube →</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    ytContainer.insertAdjacentHTML('beforeend', videosHTML);
    log('Últimos videos inyectados:', videos.length);
  }

  async function loadConfig(){
    try {
      const res = await fetch('/api/content.php');
      if(res.ok){
        const data = await res.json();
        const st = data.siteTexts || {};
        if(st.subscriberCount) CFG.subscriberCount = st.subscriberCount;
        if(st.videoCount) CFG.videoCount = st.videoCount;
        if(st.youtubeChannel) CFG.youtubeChannel = st.youtubeChannel;
        if(st.youtubePlaylist) CFG.youtubePlaylist = st.youtubePlaylist;
        if(st.youtubeApiKey) CFG.youtubeApiKey = st.youtubeApiKey;
      }
    } catch(e){ log('No se pudo cargar config:', e); }
  }
             el.className && /galeria|marca|sponsor|carrusel|slider|carousel/i.test(el.className);
    });
  }

  function makeImageClickable(img, caption){
    if(img.dataset.mancaLightbox) return;
    img.dataset.mancaLightbox = '1';
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      lightbox.open(img.src, caption || img.alt || '');
    });
  }
      const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;
      const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}&key=${CFG.youtubeApiKey}`);
      const plData = await plRes.json();
      return (plData.items || []).map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
      }));
    } catch(e){ log('Error fetching latest videos:', e); return []; }
  }
  function fmtNumber(n){
    n = String(n).replace(/\D/g,'');
    if(!n) return '0';
    const num = parseInt(n,10);
    if(num >= 1000) return (num/1000).toFixed(1).replace('.',',') + 'K';
    return num.toString();
  }