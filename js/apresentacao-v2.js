(()=>{
  const $=id=>document.getElementById(id);
  const stage=$('stage'),header=$('header'),titleEl=$('slideTitle'),iconEl=$('slideIcon'),progress=$('progress');
  let db=null,slides=[],media={},links={},current=0,lastActionTs=0,touchX=null;

  function normalise(raw){if(!raw)return[];if(Array.isArray(raw))return raw.filter(Boolean);return Object.keys(raw).sort((a,b)=>Number(a)-Number(b)).map(k=>raw[k]).filter(Boolean)}
  function clampIndex(i){return Math.max(0,Math.min(Math.max(0,slides.length-1),Number(i)||0))}
  function showError(message){stage.innerHTML=`<div class="error-state"><strong>Não foi possível carregar a apresentação.</strong>${window.KumonRenderer.esc(message)}</div>`}

  async function ensureSlides(){
    const snap=await db.ref('kumon_config/presentation/slides').once('value');
    let data=normalise(snap.val());
    if(data.length)return data;
    data=await window.LegacySlidesParser.load();
    if(!data.length)throw new Error('A versão atual não contém slides válidos.');
    await db.ref('kumon_config/presentation').update({slides:data,migratedAt:firebase.database.ServerValue.TIMESTAMP,version:2});
    return data;
  }

  function render(){
    if(!slides.length)return;
    current=clampIndex(current);
    const s=slides[current];
    window.KumonRenderer.render(stage,header,titleEl,iconEl,s,media,links);
    progress.style.width=`${((current+1)/slides.length)*100}%`;
    document.title=`${s.title||s.t||'Reunião de Pais 2026'} • Kumon`;
  }

  async function go(index){
    if(!slides.length)return;
    const next=clampIndex(index);
    if(next===current){render();return}
    current=next;render();
    try{await db.ref('kumon_config/state').update({currentSlide:current,updatedAt:firebase.database.ServerValue.TIMESTAMP})}catch(e){console.warn('Falha ao sincronizar slide',e)}
  }

  function bindFirebase(){
    db.ref('kumon_config/settings').on('value',snap=>{const v=snap.val()||{};media=v.media||{};links=v.links||{};render()});
    db.ref('kumon_config/presentation/slides').on('value',snap=>{const v=normalise(snap.val());if(v.length){slides=v;current=clampIndex(current);render()}});
    db.ref('kumon_config/state/currentSlide').on('value',snap=>{if(snap.exists()){const n=clampIndex(snap.val());if(n!==current){current=n;render()}}});
    db.ref('kumon_config/action').on('value',snap=>{const a=snap.val()||{};if(a.ts&&a.ts!==lastActionTs){lastActionTs=a.ts;if(a.type==='MEDIA_ACTION')window.KumonRenderer.mediaAction(stage)}});
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
      render();
    }catch(e){console.error(e);showError(e.message||String(e))}
  }

  $('prev').addEventListener('click',()=>go(current-1));
  $('next').addEventListener('click',()=>go(current+1));
  $('home').addEventListener('click',()=>go(0));
  $('fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(e){console.warn(e)}});
  window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(['ArrowRight','PageDown','ArrowDown'].includes(e.key)){e.preventDefault();go(current+1)}if(['ArrowLeft','PageUp','ArrowUp','Backspace'].includes(e.key)){e.preventDefault();go(current-1)}if(e.key===' '||e.key==='Enter'){e.preventDefault();window.KumonRenderer.mediaAction(stage)}if(e.key.toLowerCase()==='f')$('fullscreen').click()});
  stage.addEventListener('touchstart',e=>{touchX=e.changedTouches[0]?.clientX??null},{passive:true});
  stage.addEventListener('touchend',e=>{if(touchX===null)return;const dx=(e.changedTouches[0]?.clientX??touchX)-touchX;touchX=null;if(Math.abs(dx)>70)go(current+(dx<0?1:-1))},{passive:true});
  init();
})();
