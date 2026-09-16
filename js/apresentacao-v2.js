(()=>{
  const $=id=>document.getElementById(id);
  const stage=$('stage'),header=$('header'),titleEl=$('slideTitle'),iconEl=$('slideIcon'),progress=$('progress');

  let db=null,slides=[],media={},links={},current=0,lastActionTs=0,touchX=null,playbackRate=1;
  let lastRenderKey='';

  function normalise(raw){
    if(!raw)return[];
    if(Array.isArray(raw))return raw.filter(Boolean);
    return Object.keys(raw).sort((a,b)=>Number(a)-Number(b)).map(k=>raw[k]).filter(Boolean);
  }

  function clampRate(rate){
    rate=Number(rate);
    return [1,1.5,2].includes(rate)?rate:1;
  }

  function clampIndex(i){
    return Math.max(0,Math.min(Math.max(0,slides.length-1),Number(i)||0));
  }

  function showError(message){
    stage.innerHTML=`<div class="error-state"><strong>Não foi possível carregar a apresentação.</strong>${window.KumonRenderer.esc(message)}</div>`;
  }

  async function ensureSlides(){
    const snap=await db.ref('kumon_config/presentation/slides').once('value');
    let data=normalise(snap.val());

    if(data.length)return data;

    data=await window.LegacySlidesParser.load();

    if(!data.length)throw new Error('A versão atual não contém slides válidos.');

    await db.ref('kumon_config/presentation').update({
      slides:data,
      migratedAt:firebase.database.ServerValue.TIMESTAMP,
      version:2
    });

    return data;
  }

  function getRenderKey(s){
    const mediaUrl=s?.mediaId?(media[s.mediaId]||s.defaultMedia||''):(s?.defaultMedia||'');

    /* Evita recriar o <video> quando Firebase dispara novamente
       o mesmo conteúdo. Recriar o elemento causa quadro preto/flash
       principalmente em projetor/HDMI. */
    return JSON.stringify([
      current,
      s,
      mediaUrl,
      links
    ]);
  }

  function render(force=false){
    if(!slides.length)return;

    current=clampIndex(current);
    const s=slides[current];
    const key=getRenderKey(s);

    if(!force && key===lastRenderKey && stage.querySelector('.slide-view')){
      progress.style.width=`${((current+1)/slides.length)*100}%`;
      return;
    }

    lastRenderKey=key;

    window.KumonRenderer.render(stage,header,titleEl,iconEl,s,media,links);
    window.KumonRenderer.setPlaybackRate(stage,playbackRate);
    progress.style.width=`${((current+1)/slides.length)*100}%`;
    document.title=`${s.title||s.t||'Reunião de Pais 2026'} • Kumon`;
  }

  async function go(index){
    if(!slides.length)return;

    const next=clampIndex(index);

    if(next===current){
      render(false);
      return;
    }

    current=next;
    render(true);

    try{
      await db.ref('kumon_config/state').update({
        currentSlide:current,
        updatedAt:firebase.database.ServerValue.TIMESTAMP
      });
    }catch(e){
      console.warn('Falha ao sincronizar slide',e);
    }
  }

  function bindFirebase(){
    db.ref('kumon_config/settings').on('value',snap=>{
      const v=snap.val()||{};
      media=v.media||{};
      links=v.links||{};
      render(false);
    });

    db.ref('kumon_config/presentation/slides').on('value',snap=>{
      const v=normalise(snap.val());

      if(v.length){
        slides=v;
        current=clampIndex(current);
        render(false);
      }
    });

    db.ref('kumon_config/state/currentSlide').on('value',snap=>{
      if(snap.exists()){
        const n=clampIndex(snap.val());

        if(n!==current){
          current=n;
          render(true);
        }
      }
    });

    db.ref('kumon_config/state/mediaSpeed').on('value',snap=>{
      playbackRate=clampRate(snap.val()||1);
      window.KumonRenderer.setPlaybackRate(stage,playbackRate);
    });

    db.ref('kumon_config/action').on('value',snap=>{
      const a=snap.val()||{};

      if(a.ts&&a.ts!==lastActionTs){
        lastActionTs=a.ts;

        if(a.type==='MEDIA_ACTION'){
          window.KumonRenderer.mediaAction(stage);
        }

        if(a.type==='MEDIA_SPEED'){
          playbackRate=clampRate(a.rate);
          window.KumonRenderer.setPlaybackRate(stage,playbackRate);
        }
      }
    });
  }

  async function init(){
    try{
      firebase.initializeApp(window.KUMON_FIREBASE_CONFIG);
      db=firebase.database();

      const state=await db.ref('kumon_config/state/currentSlide').once('value');
      current=Number(state.val()||0);

      slides=await ensureSlides();
      current=clampIndex(current);

      bindFirebase();
      render(true);
    }catch(e){
      console.error(e);
      showError(e.message||String(e));
    }
  }

  $('prev').addEventListener('click',()=>go(current-1));
  $('next').addEventListener('click',()=>go(current+1));
  $('home').addEventListener('click',()=>go(0));

  $('fullscreen').addEventListener('click',async()=>{
    try{
      if(!document.fullscreenElement)await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    }catch(e){
      console.warn(e);
    }
  });

  document.addEventListener('fullscreenchange',()=>{
    /* O tamanho do palco muda ao entrar/sair de tela cheia.
       Não recriamos o vídeo; o renderer apenas recalcula o quadro via resize. */
    setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
  });

  window.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;

    if(['ArrowRight','PageDown','ArrowDown'].includes(e.key)){
      e.preventDefault();
      go(current+1);
    }

    if(['ArrowLeft','PageUp','ArrowUp','Backspace'].includes(e.key)){
      e.preventDefault();
      go(current-1);
    }

    if(e.key===' '||e.key==='Enter'){
      e.preventDefault();
      window.KumonRenderer.mediaAction(stage);
    }

    if(e.key.toLowerCase()==='f')$('fullscreen').click();
  });

  stage.addEventListener('touchstart',e=>{
    touchX=e.changedTouches[0]?.clientX??null;
  },{passive:true});

  stage.addEventListener('touchend',e=>{
    if(touchX===null)return;

    const dx=(e.changedTouches[0]?.clientX??touchX)-touchX;
    touchX=null;

    if(Math.abs(dx)>70)go(current+(dx<0?1:-1));
  },{passive:true});

  init();
})();
