let db=null,current=0,slides=[],currentSpeed=1;

const fallbackTitles=[
  'REUNIÃO DE PAIS 2026',
  'Toru Kumon: A Origem',
  'Filosofia Toru Kumon',
  'O que é o Kumon?',
  'Objetivos do Kumon',
  'Nossa História',
  'Equipe da Unidade',
  'Estrutura Pedagógica',
  'Nossos Indicadores',
  'Kumon Baby',
  'Reflexão para o Futuro',
  'Complemento Escolar',
  'Inclusão e acompanhamento',
  'Aluna Destaque',
  'Kumon Connect',
  'O mesmo Método de forma digital',
  'Como o aluno estuda pelo tablet?',
  'Recursos Disponíveis',
  'O Kumon Connect no mundo',
  'A Tríade Kumon',
  'Avisos Importantes',
  'MUITO OBRIGADO!'
];

const el=id=>document.getElementById(id);

function clampSpeed(rate){
  rate=Number(rate);
  return [1,1.5,2].includes(rate)?rate:1;
}

function updateSpeedUI(){
  const rate=clampSpeed(currentSpeed);
  const label=el('speedLabel');
  if(label)label.textContent=rate===1.5?'1,5x':rate+'x';
  document.querySelectorAll('.speed-btn').forEach(b=>{
    b.classList.toggle('active',Number(b.dataset.speed)===rate);
  });
}

function normalise(raw){
  if(!raw)return[];
  if(Array.isArray(raw))return raw.filter(Boolean);
  return Object.keys(raw)
    .sort((a,b)=>Number(a)-Number(b))
    .map(k=>raw[k])
    .filter(Boolean);
}

function slideTitle(s,i){
  if(!s)return fallbackTitles[i]||`Slide ${i+1}`;
  if(s.type==='cover')return s.t||s.title||`Slide ${i+1}`;
  if(s.type==='quote')return s.title||s.author||s.text||`Slide ${i+1}`;
  if(s.type==='sophia')return s.title||s.name||`Slide ${i+1}`;
  return s.title||s.t||s.text||s.name||`Slide ${i+1}`;
}

function titles(){
  return slides.length
    ? slides.map((s,i)=>slideTitle(s,i))
    : fallbackTitles.slice();
}

function rebuildList(){
  const list=el('slideList');
  if(!list)return;

  const ts=titles();
  list.innerHTML='';

  ts.forEach((t,i)=>{
    const b=document.createElement('button');
    b.textContent=`${String(i+1).padStart(2,'0')}  ${t}`;
    b.onclick=()=>go(i);
    list.appendChild(b);
  });
}

function clampIndex(i){
  const len=Math.max(1,titles().length);
  return Math.max(0,Math.min(len-1,Number(i)||0));
}

async function start(){
  if(db)return;

  firebase.initializeApp(window.KUMON_FIREBASE_CONFIG);

  try{
    if(firebase.auth)await firebase.auth().signInAnonymously();
  }catch(e){
    console.warn('Auth anônima não habilitada; usando regras atuais.',e);
  }

  db=firebase.database();
  el('lock').classList.add('hide');

  db.ref('.info/connected').on('value',s=>{
    const on=!!s.val();
    el('status').textContent=on?'CONECTADO':'DESCONECTADO';
    el('status').classList.toggle('on',on);
  });

  db.ref('kumon_config/presentation/slides').on('value',s=>{
    const incoming=normalise(s.val());
    if(incoming.length){
      slides=incoming;
      current=clampIndex(current);
      rebuildList();
      render();
    }else if(!slides.length){
      rebuildList();
      render();
    }
  });

  db.ref('kumon_config/state/currentSlide').on('value',s=>{
    current=clampIndex(s.val()||0);
    render();
  });

  db.ref('kumon_config/state/mediaSpeed').on('value',s=>{
    currentSpeed=clampSpeed(s.val()||1);
    updateSpeedUI();
  });
}

function render(){
  const ts=titles();
  current=clampIndex(current);

  el('currentTitle').textContent=ts[current]||'Slide';
  el('nextTitle').textContent=ts[current+1]||'Fim da apresentação';
  el('counter').textContent=`Slide ${current+1} de ${ts.length}`;

  document.querySelectorAll('#slideList button').forEach((b,i)=>{
    b.classList.toggle('active',i===current);
  });

  const active=document.querySelector('#slideList button.active');
  if(active&&typeof active.scrollIntoView==='function'){
    active.scrollIntoView({block:'nearest',behavior:'smooth'});
  }

  updateSpeedUI();
}

async function go(i){
  if(!db)return;
  i=clampIndex(i);
  await db.ref('kumon_config/state/currentSlide').set(i);
}

async function media(){
  if(db){
    await db.ref('kumon_config/action').set({
      type:'MEDIA_ACTION',
      ts:Date.now()
    });
  }
}

async function setSpeed(rate){
  if(!db)return;
  rate=clampSpeed(rate);
  currentSpeed=rate;
  updateSpeedUI();

  await db.ref('kumon_config/state/mediaSpeed').set(rate);
  await db.ref('kumon_config/action').set({
    type:'MEDIA_SPEED',
    rate,
    ts:Date.now()
  });
}

el('unlock').onclick=start;
el('prev').onclick=()=>go(current-1);
el('next').onclick=()=>go(current+1);
el('nextBig').onclick=()=>go(current+1);
el('media').onclick=media;

document.querySelectorAll('.speed-btn').forEach(btn=>{
  btn.addEventListener('click',()=>setSpeed(Number(btn.dataset.speed)));
});

rebuildList();
render();
updateSpeedUI();
