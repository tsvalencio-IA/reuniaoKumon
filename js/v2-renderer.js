window.KumonRenderer=(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=i=>`<i class="fa-solid ${esc(i||'fa-star')}"></i>`;
  let activeStage=null,resizeTimer=null;
  function youtubeId(src){try{const u=new URL(src);if(u.hostname.includes('youtu.be'))return u.pathname.slice(1).split('/')[0];if(u.hostname.includes('youtube.com'))return u.searchParams.get('v')||u.pathname.split('/embed/')[1]?.split('/')[0]||''}catch(e){}return''}
  function mediaTag(slide,media){const src=media?.[slide.mediaId]||slide.defaultMedia||'';if(!src)return `<div class="empty-media"><i class="fa-regular fa-image"></i>Mídia não definida</div>`;const y=youtubeId(src);if(y)return `<iframe class="slide-iframe" src="https://www.youtube.com/embed/${esc(y)}?enablejsapi=1&playsinline=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;const isVideo=slide.mediaType==='video'||/\.(mp4|webm|mov)(\?|$)/i.test(src)||/\/video\/upload\//i.test(src);if(isVideo)return `<video class="slide-video" src="${esc(src)}" controls playsinline preload="metadata"></video>`;return `<img class="slide-image" src="${esc(src)}" alt="${esc(slide.title||slide.t||'Mídia')}" loading="eager">`}
  function linkWrap(id,inner,links,cls=''){return links?.[id]?`<div class="${cls} linked" data-link="${esc(id)}">${inner}</div>`:`<div class="${cls}">${inner}</div>`}
  function items(slide,links){return (slide.items||[]).map((t,i)=>linkWrap(`${slide.id}_i${i}`,`<span class="check-icon"><i class="fa-solid fa-check"></i></span><div class="body-text">${esc(t)}</div>`,links,'info-card')).join('')}
  function cover(s,links){return `<section class="cover"><h2 class="mega">${esc(s.t||s.title)}</h2><div class="cover-line"></div><div class="sub">${esc(s.sub||'')}</div>${linkWrap(`${s.id}_ext`,`<span>${esc(s.ext||'')}</span>`,links,'pill')}</section>`}
  function quote(s,links){return `<section class="quote"><i class="fa-solid fa-quote-left"></i>${linkWrap(`${s.id}_t`,`<h2>“${esc(s.text||'')}”</h2>`,links)}${linkWrap(`${s.id}_auth`,`<cite>— ${esc(s.author||'')}</cite>`,links)}</section>`}
  function mediaSlide(s,media,links){const m=`<div class="media-frame">${mediaTag(s,media)}</div>`;const c=`<div class="layout-col"><div class="cards-list">${items(s,links)}</div></div>`;return `<section class="layout-row ${s.type==='media-right'?'media-right':''}">${s.type==='media-left'?m+c:c+m}</section>`}
  function mediaFull(s,media){return `<section class="media-full-stage"><div class="media-frame media-frame-full">${mediaTag(s,media)}</div></section>`}
  function grid(s,links){return `<section class="grid-cards">${(s.grid||[]).map(g=>linkWrap(g.id,`${icon(g.i)}<h3>${esc(g.t)}</h3><div class="body-text">${esc(g.d)}</div>`,links,'grid-card')).join('')}</section>`}
  function team(s,links){return `<section class="team-grid">${(s.groups||[]).map((g,gi)=>`<div class="team-group"><div class="team-title">${esc(g.t)}</div>${(g.m||[]).map((m,mi)=>linkWrap(`${s.id}_${gi}_${mi}`,`<div class="body-text">${esc(m)}</div>`,links,`info-card ${gi?'':'orange'}`)).join('')}</div>`).join('')}</section>`}
  function table(s){return `<section class="table-wrap"><table><thead><tr><th>Disciplina</th><th>Orientação Inicial</th><th>Orientação Avançada</th></tr></thead><tbody>${(s.rows||[]).map(r=>`<tr><td>${esc(r.mat)}</td><td>${esc(r.ini)}</td><td>${esc(r.ava)}</td></tr>`).join('')}</tbody></table></section>`}
  function stats(s,links){return `<section class="stats-grid">${(s.stats||[]).map((x,i)=>linkWrap(`${s.id}_s${i}`,`<strong>${esc(x.val)}</strong><span>${esc(x.label)}</span>`,links,'stat-card')).join('')}</section>`}
  function featured(s,media,links){const d=`<div class="featured-card"><span class="badge"><i class="fa-solid fa-trophy"></i> ALUNA DE SUCESSO</span>${linkWrap(`${s.id}_name`,`<h2 class="mega">${esc(s.name||'')}</h2>`,links)}<div class="layout-col">${(s.details||[]).map((x,i)=>linkWrap(`${s.id}_d${i}`,`<i class="fa-solid fa-check"></i><div class="body-text">${esc(x)}</div>`,links,'detail-line')).join('')}</div></div>`;return `<section class="layout-row featured-layout">${d}<div class="media-frame">${mediaTag(s,media)}</div></section>`}
  function list(s,links){return `<section class="layout-col"><div class="cards-list">${items(s,links)}</div></section>`}
  function end(s,links){return `<section class="end-slide"><i class="fa-regular fa-handshake" style="font-size:clamp(58px,11vmin,130px);color:var(--k-orange)"></i>${linkWrap(`${s.id}_t`,`<h2 class="mega">${esc(s.title||'')}</h2>`,links)}${linkWrap(`${s.id}_sub`,`<div class="sub">${esc(s.subtitle||'')}</div>`,links)}${linkWrap(`${s.id}_contact`,`<span>${esc(s.contact||'')}</span>`,links,'contact')}</section>`}

  function sizeFrame(frame,w,h){
    if(!frame||!w||!h||!activeStage)return;
    const ratio=Math.max(.35,Math.min(2.6,w/h));
    frame.dataset.mediaWidth=String(w);frame.dataset.mediaHeight=String(h);
    frame.classList.toggle('media-portrait',ratio<.9);
    frame.classList.toggle('media-square',ratio>=.9&&ratio<=1.12);
    frame.classList.toggle('media-landscape',ratio>1.12);
    frame.style.width='';frame.style.height='';frame.style.aspectRatio='';
    requestAnimationFrame(()=>{
      if(!frame.isConnected)return;
      const trackWidth=frame.getBoundingClientRect().width||frame.parentElement?.getBoundingClientRect().width||600;
      const stageRect=activeStage.getBoundingClientRect();
      const mobile=window.matchMedia('(max-width:820px),(orientation:portrait)').matches;
      const viewportFactor=mobile ? .42 : .61;
      const stageFactor=mobile ? .58 : .94;
      const maxHeight=Math.max(220,Math.min(window.innerHeight*viewportFactor,stageRect.height*stageFactor));
      let targetW=trackWidth;
      let targetH=targetW/ratio;
      if(targetH>maxHeight){targetH=maxHeight;targetW=targetH*ratio}
      if(targetW>trackWidth){targetW=trackWidth;targetH=targetW/ratio}
      frame.style.width=Math.max(1,Math.round(targetW))+'px';
      frame.style.height=Math.max(1,Math.round(targetH))+'px';
      frame.style.aspectRatio='auto';
    });
  }
  function refitKnownFrames(){if(!activeStage)return;activeStage.querySelectorAll('.media-frame[data-media-width][data-media-height]').forEach(frame=>sizeFrame(frame,Number(frame.dataset.mediaWidth),Number(frame.dataset.mediaHeight)))}
  function fitMediaFrames(stage){activeStage=stage;stage.querySelectorAll('.media-frame').forEach(frame=>{const img=frame.querySelector('img');const video=frame.querySelector('video');const iframe=frame.querySelector('iframe');if(iframe){sizeFrame(frame,16,9);return}if(img){const set=()=>sizeFrame(frame,img.naturalWidth,img.naturalHeight);if(img.complete&&img.naturalWidth)set();else img.addEventListener('load',set,{once:true});return}if(video){const set=()=>sizeFrame(frame,video.videoWidth,video.videoHeight);if(video.readyState>=1&&video.videoWidth)set();else video.addEventListener('loadedmetadata',set,{once:true})}})}
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(refitKnownFrames,120)});

  function render(stage,header,titleEl,iconEl,s,media,links){if(!s)return;activeStage=stage;const noHead=['cover','quote','end'].includes(s.type);header.classList.toggle('hidden',noHead);if(!noHead){titleEl.textContent=s.title||s.t||'Apresentação';iconEl.innerHTML=icon(s.icon)}let html='';switch(s.type){case'cover':html=cover(s,links);break;case'quote':html=quote(s,links);break;case'media-left':case'media-right':html=mediaSlide(s,media,links);break;case'media-full':html=mediaFull(s,media);break;case'grid':html=grid(s,links);break;case'team':html=team(s,links);break;case'table':html=table(s);break;case'stats':html=stats(s,links);break;case'sophia':html=featured(s,media,links);break;case'list':html=list(s,links);break;case'end':html=end(s,links);break;default:html=list({...s,items:s.items||[s.text||s.subtitle||'']},links)}stage.innerHTML=`<div class="slide-view">${html}</div>`;fitMediaFrames(stage);stage.querySelectorAll('[data-link]').forEach(el=>{el.style.cursor='pointer';el.addEventListener('click',()=>{const u=links?.[el.dataset.link];if(u)window.open(u,'_blank','noopener')})})}
  function mediaAction(stage){const v=stage.querySelector('video.slide-video');if(v){v.paused?v.play().catch(()=>{}):v.pause();return}const f=stage.querySelector('iframe.slide-iframe');if(f){const state=f.dataset.playing==='1';f.dataset.playing=state?'0':'1';f.contentWindow?.postMessage(JSON.stringify({event:'command',func:state?'pauseVideo':'playVideo',args:[]}),'*')}}
  return{render,mediaAction,esc};
})();
