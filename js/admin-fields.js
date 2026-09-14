window.KumonAdminFields=(()=>{
  const types=[['cover','Capa'],['media-left','Mídia à esquerda + tópicos'],['media-right','Tópicos + mídia à direita'],['media-full','Mídia em destaque'],['list','Lista de tópicos'],['grid','Grade de cards'],['team','Grupos / equipe'],['table','Tabela'],['stats','Indicadores / números'],['quote','Frase / reflexão'],['sophia','Pessoa / aluno destaque'],['end','Encerramento']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function typeOptions(){return types.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
  function titleOf(s){return s.type==='cover'?(s.t||''):s.type==='quote'?(s.text||''):(s.title||'')}
  function labelOf(s){return s.title||s.t||s.text||s.name||'Slide sem título'}
  function needsMedia(type){return['media-left','media-right','media-full','sophia'].includes(type)}
  function optional(type){return{subtitle:['cover','end'].includes(type),author:type==='quote',contact:type==='end'}}
  function newId(prefix='slide'){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6)}
  function fresh(type='list',title='Novo slide'){
    const id=newId('slide'),base={id,type};
    if(type==='cover')return{...base,t:title,sub:'',ext:'Bem-vindos!'};
    if(type==='quote')return{...base,text:title,author:''};
    if(type==='end')return{...base,title,subtitle:'',contact:''};
    if(type==='grid')return{...base,title,icon:'fa-star',grid:[{id:newId('card'),t:'Novo tópico',d:'Descrição',i:'fa-star'}]};
    if(type==='team')return{...base,title,icon:'fa-users',groups:[{t:'Novo grupo',m:['Novo item']}]};
    if(type==='table')return{...base,title,icon:'fa-table',rows:[{mat:'Item',ini:'Informação',ava:'Destaque'}]};
    if(type==='stats')return{...base,title,icon:'fa-chart-pie',stats:[{label:'Indicador',val:'0'}]};
    if(type==='sophia')return{...base,title,icon:'fa-star',name:'Nome',mediaId:'media_'+id,mediaType:'video',details:['Informação']};
    if(type==='media-left'||type==='media-right'||type==='media-full')return{...base,title,icon:'fa-image',mediaId:'media_'+id,items:type==='media-full'?[]:['Novo tópico']};
    return{...base,title,icon:'fa-list-check',items:['Novo tópico']};
  }
  function convert(old,type){if(old.type===type)return old;const n=fresh(type,labelOf(old));n.id=old.id;n.icon=old.icon||n.icon;if(needsMedia(type)){n.mediaId=old.mediaId||('media_'+old.id);n.mediaType=old.mediaType||n.mediaType}if(n.items&&old.items)n.items=structuredClone(old.items);if(n.grid&&old.grid)n.grid=structuredClone(old.grid);if(n.groups&&old.groups)n.groups=structuredClone(old.groups);if(n.rows&&old.rows)n.rows=structuredClone(old.rows);if(n.stats&&old.stats)n.stats=structuredClone(old.stats);if(n.details&&old.details)n.details=structuredClone(old.details);return n}
  const del='<button type="button" data-remove title="Remover"><i class="fa-solid fa-xmark"></i></button>';
  function renderDynamic(s,root){let h='';
    if(s.type==='cover')h=`<div class="dynamic-row"><input data-prop="ext" value="${esc(s.ext||'')}" placeholder="Texto de boas-vindas">${del}</div>`;
    else if(['list','media-left','media-right'].includes(s.type))h=(s.items||[]).map((x,i)=>`<div class="dynamic-row" data-index="${i}"><input data-prop="item" value="${esc(x)}" placeholder="Tópico">${del}</div>`).join('');
    else if(s.type==='media-full')h='<div style="color:var(--muted);font-size:12px">Este layout prioriza a imagem ou vídeo. Título e mídia são configurados acima.</div>';
    else if(s.type==='grid')h=(s.grid||[]).map((x,i)=>`<div class="dynamic-row triple" data-index="${i}"><input data-prop="t" value="${esc(x.t)}" placeholder="Título"><input data-prop="d" value="${esc(x.d)}" placeholder="Descrição"><input data-prop="i" value="${esc(x.i||'fa-star')}" placeholder="Ícone">${del}</div>`).join('');
    else if(s.type==='team')h=(s.groups||[]).map((x,i)=>`<div class="dynamic-row multi" data-index="${i}"><input data-prop="t" value="${esc(x.t)}" placeholder="Grupo"><textarea data-prop="m" rows="3" placeholder="Um item por linha">${esc((x.m||[]).join('\n'))}</textarea>${del}</div>`).join('');
    else if(s.type==='table')h=(s.rows||[]).map((x,i)=>`<div class="dynamic-row triple" data-index="${i}"><input data-prop="mat" value="${esc(x.mat)}" placeholder="Coluna 1"><input data-prop="ini" value="${esc(x.ini)}" placeholder="Coluna 2"><input data-prop="ava" value="${esc(x.ava)}" placeholder="Coluna 3">${del}</div>`).join('');
    else if(s.type==='stats')h=(s.stats||[]).map((x,i)=>`<div class="dynamic-row multi" data-index="${i}"><input data-prop="label" value="${esc(x.label)}" placeholder="Indicador"><input data-prop="val" value="${esc(x.val)}" placeholder="Valor">${del}</div>`).join('');
    else if(s.type==='sophia')h=`<div class="dynamic-row"><input data-prop="name" value="${esc(s.name||'')}" placeholder="Nome da pessoa">${del}</div>`+(s.details||[]).map((x,i)=>`<div class="dynamic-row" data-detail data-index="${i}"><input data-prop="detail" value="${esc(x)}" placeholder="Informação">${del}</div>`).join('');
    else h='<div style="color:var(--muted);font-size:12px">Este tipo não usa campos adicionais.</div>';
    root.innerHTML=h;
  }
  function collect(s,root){
    if(s.type==='cover'){const e=root.querySelector('[data-prop="ext"]');s.ext=e?e.value:''}
    else if(['list','media-left','media-right'].includes(s.type))s.items=[...root.querySelectorAll('[data-prop="item"]')].map(x=>x.value);
    else if(s.type==='grid')s.grid=[...root.querySelectorAll('.dynamic-row[data-index]')].map(r=>({id:s.grid?.[Number(r.dataset.index)]?.id||newId('card'),t:r.querySelector('[data-prop="t"]').value,d:r.querySelector('[data-prop="d"]').value,i:r.querySelector('[data-prop="i"]').value||'fa-star'}));
    else if(s.type==='team')s.groups=[...root.querySelectorAll('.dynamic-row[data-index]')].map(r=>({t:r.querySelector('[data-prop="t"]').value,m:r.querySelector('[data-prop="m"]').value.split('\n').map(x=>x.trim()).filter(Boolean)}));
    else if(s.type==='table')s.rows=[...root.querySelectorAll('.dynamic-row[data-index]')].map(r=>({mat:r.querySelector('[data-prop="mat"]').value,ini:r.querySelector('[data-prop="ini"]').value,ava:r.querySelector('[data-prop="ava"]').value}));
    else if(s.type==='stats')s.stats=[...root.querySelectorAll('.dynamic-row[data-index]')].map(r=>({label:r.querySelector('[data-prop="label"]').value,val:r.querySelector('[data-prop="val"]').value}));
    else if(s.type==='sophia'){s.name=root.querySelector('[data-prop="name"]')?.value||'';s.details=[...root.querySelectorAll('[data-prop="detail"]')].map(x=>x.value)}
    return s
  }
  function add(s){if(s.type==='cover')s.ext=s.ext||'Novo texto';else if(['list','media-left','media-right'].includes(s.type))(s.items??=[]).push('Novo tópico');else if(s.type==='grid')(s.grid??=[]).push({id:newId('card'),t:'Novo tópico',d:'Descrição',i:'fa-star'});else if(s.type==='team')(s.groups??=[]).push({t:'Novo grupo',m:['Novo item']});else if(s.type==='table')(s.rows??=[]).push({mat:'Item',ini:'Informação',ava:'Destaque'});else if(s.type==='stats')(s.stats??=[]).push({label:'Indicador',val:'0'});else if(s.type==='sophia')(s.details??=[]).push('Nova informação');return s}
  return{types,typeOptions,titleOf,labelOf,needsMedia,optional,newId,fresh,convert,renderDynamic,collect,add,esc};
})();
