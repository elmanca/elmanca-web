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
  async function fetchYouTubeStats(){
    if(!CFG.youtubeApiKey){
      log('No hay YouTube API key, usando valores estáticos');
      return {subs: CFG.subscriberCount, videos: CFG.videoCount};
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
  function fmtNumber(n){
    n = String(n).replace(/\D/g,'');
    if(!n) return '0';
    const num = parseInt(n,10);
    if(num >= 1000) return (num/1000).toFixed(1).replace('.',',') + 'K';
    return num.toString();
  }