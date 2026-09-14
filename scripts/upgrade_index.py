from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'KUMON_V2_UPGRADED' in s:
    print('index.html já atualizado')
    raise SystemExit(0)

# Remove bibliotecas e elementos exclusivos do antigo controle por câmera/AR.
s=re.sub(r'\s*<!-- TENSORFLOW & MOVENET.*?</script>\s*<script[^>]*pose-detection[^>]*></script>\s*','\n',s,flags=re.S)
s=re.sub(r'\s*<div id="ar-status-warning".*?<canvas id="ar-canvas"></canvas>\s*','\n',s,flags=re.S)
s=re.sub(r'\s*<button id="btn-ar-toggle".*?</button>\s*','\n',s,flags=re.S)
s=re.sub(r'\s*<!-- PAINEL DE CONTROLE AR -->.*?<!-- CONTEÚDO PRINCIPAL DA APRESENTAÇÃO -->','\n        <!-- CONTEÚDO PRINCIPAL DA APRESENTAÇÃO -->',s,flags=re.S)

# Remove o CSS exclusivo do AR e injeta a camada responsiva V2.
responsive='''
        /* KUMON_V2_UPGRADED - responsividade inteligente */
        html,body,#app-container{width:100%;height:100dvh;min-height:100dvh;touch-action:manipulation}
        #app-container{overflow:hidden}
        .header-area{height:auto;min-height:clamp(64px,11dvh,112px);padding:clamp(10px,2vh,22px) clamp(16px,4vw,64px)}
        .main-area{height:auto;flex:1;min-height:0;padding:clamp(12px,2vh,28px) clamp(16px,4vw,64px);overflow:auto}
        .footer-area{height:auto;min-height:clamp(62px,10dvh,96px);padding:10px clamp(16px,4vw,64px)}
        .txt-mega{font-size:clamp(2rem,7vmin,6.2rem)}
        .txt-title{font-size:clamp(1.35rem,4.6vmin,4.2rem)}
        .txt-sub{font-size:clamp(.9rem,2.8vmin,2.2rem)}
        .txt-body{font-size:clamp(.92rem,2.25vmin,1.9rem)}
        .txt-small{font-size:clamp(.62rem,1.35vmin,1rem)}
        .media-box img,.media-box video,.media-box iframe{max-width:100%;max-height:100%;object-fit:contain}
        .remote-shortcut{display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
        @media(max-width:760px),(orientation:portrait){
          .header-area{min-height:72px}.main-area{justify-content:flex-start;overflow:auto}
          .flex-row-locked{flex-direction:column;height:auto;min-height:100%;gap:14px;align-items:stretch!important}
          .flex-col-locked{height:auto;min-height:0;gap:12px}
          .grid-locked{height:auto;grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .card-box,.grid-card{flex:none;min-height:92px;padding:16px}
          .media-box{min-height:30dvh;max-height:42dvh}
          .editable-media{width:100%;min-height:30dvh;flex:none!important}
          .table-container{max-width:100%;overflow:auto}.table-container table{min-width:640px}
          .footer-area{min-height:70px;gap:10px}.btn-nav{width:48px;height:48px;font-size:18px}.btn-logo{width:54px;height:54px;font-size:22px}
          .btn-extras{font-size:25px;margin-right:10px}
        }
        @media(max-width:480px){.grid-locked{grid-template-columns:1fr!important}.header-area{padding-inline:14px}.main-area{padding:12px 14px}.footer-area{padding-inline:14px}.footer-area .txt-small{display:none}}
'''
sec=s.find('/* =========================================================================\n           7. PAINEL DE CONTROLE AR')
end=s.find('</style>',sec)
if sec!=-1 and end!=-1:s=s[:sec]+responsive+'\n    '+s[end:]
else:s=s.replace('</style>',responsive+'\n    </style>',1)

# Abre o editor profissional a partir do modo gestor.
editor_btn='''<button id="btn-open-editor" onclick="window.open('admin.html','kumonEditor')" style="background:#00AEEF;color:white;border:none;padding:1.5vmin 3vmin;border-radius:4vmin;font-weight:800;font-size:2.2vmin;cursor:pointer"><i class="fa-solid fa-pen-to-square"></i> EDITOR DE SLIDES</button>\n            '''
s=s.replace('<button id="btn-config-cloudinary"',editor_btn+'<button id="btn-config-cloudinary"',1)

# Atalho discreto para o controle remoto no celular.
remote_btn='''<a class="btn-extras remote-shortcut" href="controle.html" target="kumonRemote" title="Controle remoto pelo celular"><i class="fa-solid fa-mobile-screen-button"></i></a>\n                '''
s=s.replace('<button class="btn-extras" onclick="window.toggleFullScreen()"',remote_btn+'<button class="btn-extras" onclick="window.toggleFullScreen()"',1)

# A apresentação passa a aceitar a estrutura completa de slides salva no Firebase.
s=s.replace('const slidesData = [','let slidesData = [',1)
sync='''        window.defaultSlidesV2 = JSON.parse(JSON.stringify(slidesData));
        window.slidesData = slidesData;
        let presentationSeededV2 = false;
        function normalizeSlidesV2(raw){
            if(!raw) return [];
            if(Array.isArray(raw)) return raw.filter(Boolean);
            return Object.keys(raw).sort((a,b)=>Number(a)-Number(b)).map(k=>raw[k]).filter(Boolean);
        }
        if(db){
            db.ref("kumon_config/presentation/slides").on("value", snapshot => {
                if(!snapshot.exists()){
                    if(!presentationSeededV2){presentationSeededV2=true;db.ref("kumon_config/presentation/slides").set(window.defaultSlidesV2);}
                    return;
                }
                const incoming=normalizeSlidesV2(snapshot.val());
                if(!incoming.length) return;
                slidesData=incoming;window.slidesData=slidesData;
                if(window.currentIndex>=slidesData.length) window.currentIndex=Math.max(0,slidesData.length-1);
                window.lastRenderedIndex=-1;
                if(window.renderSlide) window.renderSlide(true);
            });
        }

'''
needle='        ];\n\n        window.getMediaTag'
if needle in s:s=s.replace(needle,'        ];\n\n'+sync+'        window.getMediaTag',1)
else:print('Aviso: ponto de sincronização não localizado')

# Remove toda a lógica de câmera, MoveNet e rastreamento corporal.
start=s.find('// MÓDULO AR V177')
if start!=-1:
    line=s.rfind('\n',0,start)
    stop=s.find('window.onload = function',start)
    if stop!=-1:s=s[:line+1]+s[stop:]

p.write_text(s,encoding='utf-8')
print('index.html atualizado para V2')
