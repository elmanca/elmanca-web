// ============================================
// MANCA CUSTOM — Inyección post-carga del bundle
// YouTube RSS (gratis, sin API key) + carruseles + lightbox
// ============================================
(function(){
  'use strict';
  const CFG = {
    youtubeChannel: '@elmancasg',
    youtubePlaylist: 'UU3woFJgJr1F8-55tU9Bxz3Q',
    subscriberCount: '1.290',
    videoCount: '116',
    debug: false
  };
  function log(...a){ if(CFG.debug) console.log('[MancaCustom]', ...a); }
  function $(sel, ctx=document){ return ctx.querySelector(sel); }
  function $$(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }
  function fmtNumber(n){
    n = String(n).replace(/\D/g,'');
    if(!n) return '0';
    const num = parseInt(n,10);
    if(num >= 1000) return (num/1000).toFixed(1).replace('.',',') + 'K';
    return num.toString();
  }

  async function fetchLatestVideosRSS(maxResults=6){
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${CFG.youtubePlaylist}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('RSS no disponible');
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml');
      const entries = xml.getElementsByTagName('entry');
      const videos = [];
      for(let i=0; i<entries.length && i<maxResults; i++){
        const e = entries[i];
        const titleEl = e.getElementsByTagName('title')[0];
        const linkEl = e.getElementsByTagName('link')[0];
        const thumbEls = e.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail');
        const ytIdEls = e.getElementsByTagNameNS('http://www.youtube.com/xml/schemas/2015', 'videoId');
        let thumbnail = '';
        if(thumbEls && thumbEls.length>0) thumbnail = thumbEls[0].getAttribute('url') || '';
        let videoId = '';
        if(ytIdEls && ytIdEls.length>0) videoId = ytIdEls[0].textContent || '';
        if(!videoId && linkEl){
          const m = (linkEl.getAttribute('href')||'').match(/[?&]v=([^&]+)/);
          if(m) videoId = m[1];
        }
        if(!videoId) continue;
        videos.push({
          id: videoId,
          title: titleEl ? titleEl.textContent : 'Video de El Canal',
          thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`
        });
      }
      return videos;
    } catch(e){
      log('Error fetching YouTube RSS:', e);
      return [];
    }
  }

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
    return num.toString();
  }
  function initCarousel(container){
    if(container.dataset.mancaCarousel) return;
    container.dataset.mancaCarousel = '1';

    $$('img', container).forEach(img => {
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
             (el.className && /galeria|marca|sponsor|carrusel|slider|carousel/i.test(el.className));
    });
  async function updateCanalSection(){
    // Contadores de suscriptores/videos: valores editables desde siteContent.json (sin API key de YouTube)
    const stats = {subs: CFG.subscriberCount, videos: CFG.videoCount};

    const texto = $$('*').find(el => {
      const t = el.textContent || '';
      return t.includes('suscriptores') || t.includes('@elmancasg') || t.includes('producciones');
    });

    if(!texto){
      log('No se encontró la sección de El Canal aún');
      return false;
    }

    const parent = texto.closest('div, section, article') || texto.parentElement;
    if(parent){
      const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while(node = walker.nextNode()){
        if(node.textContent.includes('suscriptores') || node.textContent.includes('producciones')){
          node.textContent = node.textContent
            .replace(/\+\d[\d.,]*\s*suscriptores/i, `+${stats.subs} suscriptores`)
            .replace(/\d[\d.,]*\s*producciones/i, `${stats.videos} producciones`);
        }
      }
      log('Contadores actualizados:', stats);
    }

    // Últimos 6 videos vía RSS de YouTube (gratis)
    const videos = await fetchLatestVideosRSS(6);
    if(videos.length > 0){
      renderLatestVideos(videos);
    }

    return true;
  }

  function renderLatestVideos(videos){
    const ytContainer = $$('section, div').find(el => {
      const html = el.innerHTML || '';
      return html.includes('youtube.com/embed') || html.includes('youtube.com/watch') || el.id?.includes('canal') || el.className?.includes('canal');
    }) || $$('section').find(el => el.innerHTML.includes('Últimos videos')) || null;

    if(!ytContainer){
      // Si no hay contenedor existente, buscar la sección por el heading del canal
      const canalSection = $$('section, div').find(el => {
        const t = el.textContent || '';
        return t.includes('El Canal') && t.includes('@elmancasg');
      });
      if(!canalSection){
        log('No se encontró contenedor para inyectar últimos videos');
        return;
      }
      // Insertar después de la sección del canal
      canalSection.insertAdjacentHTML('afterend', buildVideosHTML(videos));
      log('Últimos videos inyectados (después de sección canal):', videos.length);
      return;
    }

    ytContainer.insertAdjacentHTML('beforeend', buildVideosHTML(videos));
    log('Últimos videos inyectados:', videos.length);
  }

  function buildVideosHTML(videos){
    return `
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
      }
    } catch(e){ log('No se pudo cargar config:', e); }
  }
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