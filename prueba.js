/* La Milpa · la prueba con amigos (docs/milpa-plan-lanzamiento.md §10–§12). No es parte del juego.
   - La ronda llega por el enlace: #ronda-a (un día, modo prueba) o #ronda-b (una semana, ritmo normal y reloj real).
     También ?ronda=a|b (para la app instalada en la pantalla de inicio). #luis quita el modo amigo en ese navegador.
     Sin nada en el enlace, un jugador nuevo de la página publicada entra a la ronda A (un solo link para compartir).
   - En modo amigo se esconden Reiniciar y el botón ⋯ del panel, y aparece "Tu opinión".
   - Lleva un registro sin datos personales (sesiones, juegos y cuánto tardó cada uno) y hace las preguntas del §11.
   - La opinión se manda a Luis con el menú de compartir del teléfono, o se copia. No hay servidor.
   index.html lo carga antes de leer el modo; si falta este archivo, el prototipo funciona igual. */
(function(){
'use strict';
const ls={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const K={ronda:'milpa.prueba.ronda',reg:'milpa.prueba.registro',luis:'milpa.prueba.luis'};

/* ---------- la ronda, desde el enlace ---------- */
function leerEnlace(){
  const h=(location.hash||'').replace('#','').toLowerCase();
  if(h==='ronda-a'||h==='ronda-b')return h.slice(-1);
  if(h==='luis')return 'luis';
  try{const q=new URLSearchParams(location.search).get('ronda');if(q==='a'||q==='b')return q;}catch(e){}
  return null;}
const enlace=leerEnlace();
function fijarRonda(r){
  ls.set(K.ronda,r);
  ls.set('milpa.prototipo.modo',r==='a'?'prueba':'normal');}
if(enlace==='a'||enlace==='b'){fijarRonda(enlace);ls.del(K.luis);}
else if(enlace==='luis'){ls.del(K.ronda);ls.set(K.luis,'1');}
/* un solo link (Luis, 19 nov): en la página publicada, quien llega por primera vez (sin milpa guardada) entra a la
   ronda A. Quien ya jugaba antes (Luis) no cambia, y dentro del Artifact no se aplica. */
const enArtifact=/claude/i.test(location.hostname);
if(!enlace&&!enArtifact&&!ls.get(K.ronda)&&!ls.get(K.luis)&&!ls.get('milpa.prototipo.v1'))fijarRonda('a');
let ronda=ls.get(K.ronda);   /* 'a' | 'b' | null */
const RELOJ={a:'rapido',b:'real'};
const NOMBRE={a:'ronda A, un día',b:'ronda B, una semana'};

/* ---------- estilos (en píxel, como las secciones del prototipo) ---------- */
const css=`
#app.amigo #reiniciar,#app.amigo .dev-b{display:none!important}
#mp-opinion{position:absolute;left:calc(var(--u)*10);bottom:calc(env(safe-area-inset-bottom,0px) + var(--u)*8);z-index:8;padding:calc(var(--u)*6) calc(var(--u)*10);
  font:400 calc(var(--u)*13)/1 "Silkscreen","Pixelify Sans",monospace;color:#FFFFFF;background:rgba(10,16,12,.68);
  text-shadow:1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000}
.mp-velo{position:absolute;inset:0;z-index:11;background:rgba(6,10,8,.6);display:flex;align-items:flex-end;justify-content:center;pointer-events:auto;
  padding:calc(env(safe-area-inset-top,0px) + var(--u)*16) calc(var(--u)*10) calc(env(safe-area-inset-bottom,0px) + var(--u)*10)}
.mp-hoja{width:100%;max-height:100%;overflow-y:auto;background:rgba(10,16,12,.97);color:#FFFFFF;padding:calc(var(--u)*18) calc(var(--u)*16);
  display:flex;flex-direction:column;gap:calc(var(--u)*14);font:400 calc(var(--u)*13)/1.35 "Silkscreen","Pixelify Sans",monospace;
  box-shadow:inset 0 0 0 calc(var(--u)*1.6667) rgba(255,255,255,.35)}
#app.noche .mp-hoja{background:rgba(8,11,26,.97)}
.mp-hoja h2{font:400 calc(var(--u)*20)/1.15 "Silkscreen","Pixelify Sans",monospace;margin:0;color:#F2C230}
.mp-hoja p{margin:0;color:#D3DCCE}
.mp-preg{display:flex;flex-direction:column;gap:calc(var(--u)*8)}
.mp-preg .q{font-size:calc(var(--u)*14);color:#FFFFFF}
.mp-ops{display:flex;flex-wrap:wrap;gap:calc(var(--u)*6)}
.mp-ops button,.mp-btn{font:400 calc(var(--u)*13)/1.1 "Silkscreen","Pixelify Sans",monospace;color:#FFFFFF;padding:calc(var(--u)*8) calc(var(--u)*10);
  box-shadow:inset 0 0 0 calc(var(--u)*1.6667) rgba(255,255,255,.55);background:transparent;text-align:left}
.mp-ops button[aria-pressed="true"]{background:#F2C230;color:#18201A;box-shadow:none}
.mp-btn.prim{background:#F2C230;color:#18201A;box-shadow:none;text-align:center}
.mp-fila{display:flex;flex-wrap:wrap;gap:calc(var(--u)*8);justify-content:flex-end}
.mp-hoja textarea{width:100%;min-height:calc(var(--u)*70);font:400 calc(var(--u)*13)/1.35 "Silkscreen","Pixelify Sans",monospace;color:#18201A;background:#FFFFFF;border:0;padding:calc(var(--u)*8);resize:vertical}
.mp-hoja textarea.salida{min-height:calc(var(--u)*130);font-size:calc(var(--u)*11)}
.mp-nota{font-size:calc(var(--u)*11);color:#B9C3B4}
`;
function ponerEstilos(){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}

/* ---------- el registro (solo números del juego; nada personal) ---------- */
let reg=null;
function cargarReg(){try{reg=JSON.parse(ls.get(K.reg)||'null');}catch(e){reg=null;}
  if(!reg||reg.v!==1)reg={v:1,inicio:Date.now(),sesiones:[],juegos:{},pantallas:{},resp:{},invitado:0,enviado:0};
  reg.ronda=ronda;}
function guardarReg(){if(reg)ls.set(K.reg,JSON.stringify(reg));}
let sesion=null;
function abrirSesion(){sesion={t0:Date.now(),ms:0,desde:Date.now()};reg.sesiones.push([sesion.t0,0]);if(reg.sesiones.length>300)reg.sesiones.shift();guardarReg();}
function cerrarTramo(){if(!sesion||!sesion.desde)return;sesion.ms+=Date.now()-sesion.desde;sesion.desde=0;
  const s=reg.sesiones[reg.sesiones.length-1];if(s&&s[0]===sesion.t0)s[1]=Math.round(sesion.ms/1000);guardarReg();}
let oculto=0;
function vigilarSesiones(){
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cerrarTramo();oculto=Date.now();}
    else{if(!sesion||Date.now()-oculto>2*60*1000)abrirSesion();else sesion.desde=Date.now();}});
  window.addEventListener('pagehide',cerrarTramo);}

let juego=null;   /* el juego en curso: {tipo, t0} */
function claveJuego(d){return (d.practica?'práctica · ':'')+d.tipo;}
function sumaJuego(k,campo,v){const j=reg.juegos[k]||(reg.juegos[k]={n:0,s:0,sin:0});j[campo]+=v;}

/* ---------- lo que el prototipo nos deja leer ---------- */
let api=null;
function resumen(){
  if(!api)return {};
  const est=api.est(),D=api.D;
  const parcelas=Object.values(est.parcelas||{}).filter(p=>p&&p.estado!=='porAbrir').length;
  const s=api.sucesos();
  return {dia:Math.floor(api.horaDeJuego()/24)+1,reloj:est.reloj.tipo,modo:api.modo,parcelas,total:D.mapa.orden.length,piso:est.troje.piso,
    mazorcas:est.troje.mazorcas,tipos:Object.keys(est.muestrario||{}).length,c:est.contadores,sucesos:s.vistos,sucesosTotal:s.total};}

/* ---------- las preguntas (docs/milpa-plan-lanzamiento.md §11.2) ---------- */
const P={
  claro:{q:'¿Qué tan claro te quedó cómo se escribe un número con puntos y barras?',o:['Muy claro','Más o menos','Me perdí']},
  dificil:{q:'¿Qué juego se te hizo más difícil de entender?',o:['La siembra','La lluvia','La cosecha','La quema','Ninguno']},
  gusto:{q:'¿Qué fue lo que más te gustó?',o:['Los juegos de números','Ver crecer la milpa','Mirar el monte y lo que pasa','Las mazorcas','La troje']},
  larga:{q:'¿Qué parte se te hizo más larga?',o:['La siembra','La cosecha','Las lluvias','Esperar','Ninguna']},
  sentir:{q:'Cuando cerrabas el juego, ¿cómo te sentías?',o:['Tranquilo','Con ganas de volver','Con pendientes','Aburrido']},
  volver:{q:'¿Por qué volvías?',o:['Para ver cómo iba','Para que no se pudriera','Por los juegos','Porque me lo pidieron','No volví'],solo:'b'},
  sucesos:{q:'¿Viste algo extraño en el monte?',o:['Sí, varias cosas','Una vez','No']},
  precio:{q:'Si estuviera en la tienda, ¿cuánto pagarías?',o:['Solo si es gratis','MXN 19–29','MXN 49','MXN 79','Más']},
};
const PRIMERAS=['claro','dificil'],FINALES=['gusto','larga','sentir','volver','sucesos','precio'];

function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function hoja(){const v=el('div','mp-velo'),h=el('div','mp-hoja');v.append(h);api.app.append(v);
  v.addEventListener('click',e=>{if(e.target===v)cerrar();});
  const cerrar=()=>{v.remove();guardarReg();};return {v,h,cerrar};}
function pregunta(clave){
  const p=P[clave],box=el('div','mp-preg');box.append(el('div','q',p.q));
  const ops=el('div','mp-ops');
  p.o.forEach(o=>{const b=el('button',null,o);b.type='button';b.setAttribute('aria-pressed',String(reg.resp[clave]===o));
    b.addEventListener('click',()=>{reg.resp[clave]=o;ops.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));guardarReg();});
    ops.append(b);});
  box.append(ops);return box;}

function hojaPrimeras(){
  const {h,cerrar}=hoja();
  h.append(el('h2',null,'Dos preguntas rápidas'),el('p',null,'Ya cosechaste. Ayúdanos con un toque en cada una; puedes seguir jugando después.'));
  PRIMERAS.forEach(k=>h.append(pregunta(k)));
  const f=el('div','mp-fila'),b=el('button','mp-btn prim','Seguir jugando');b.type='button';b.addEventListener('click',cerrar);f.append(b);h.append(f);}

function hojaInvitacion(){
  const {h,cerrar}=hoja();
  h.append(el('h2',null,'¿Nos cuentas cómo te fue?'),el('p',null,'Son seis preguntas de un toque y un comentario si quieres. También puedes hacerlo después con "Tu opinión", abajo a la izquierda.'));
  const f=el('div','mp-fila');
  const luego=el('button','mp-btn','Más tarde');luego.type='button';luego.addEventListener('click',cerrar);
  const ya=el('button','mp-btn prim','Ahora');ya.type='button';ya.addEventListener('click',()=>{cerrar();hojaOpinion();});
  f.append(luego,ya);h.append(f);}

function hojaOpinion(){
  const {h,cerrar}=hoja();
  h.append(el('h2',null,'Tu opinión'),el('p',null,'Toca una respuesta en cada pregunta. No hay respuestas buenas ni malas.'));
  [...PRIMERAS,...FINALES].forEach(k=>{if(!P[k].solo||P[k].solo===ronda)h.append(pregunta(k));});
  const libre=el('div','mp-preg');libre.append(el('div','q','¿Algo más que quieras decirle a Luis?'));
  const ta=el('textarea');ta.id='mp-comentario';ta.value=reg.resp.comentario||'';ta.addEventListener('input',()=>{reg.resp.comentario=ta.value.slice(0,2000);guardarReg();});
  libre.append(ta);h.append(libre);
  h.append(el('p','mp-nota','Al enviar se agrega un registro del juego: cuántas veces entraste, qué juegos jugaste y cuánto tardaste. No lleva tu nombre ni nada personal.'));
  const f=el('div','mp-fila');
  const cer=el('button','mp-btn','Cerrar');cer.type='button';cer.addEventListener('click',cerrar);
  const env=el('button','mp-btn prim','Enviar a Luis');env.type='button';env.addEventListener('click',()=>{cerrarTramo();if(sesion)sesion.desde=Date.now();enviar(h);});
  f.append(cer,env);h.append(f);}

/* ---------- el texto que se manda ---------- */
function dur(s){s=Math.round(s);if(s<60)return s+' s';const m=Math.round(s/60);if(m<60)return m+' min';return Math.floor(m/60)+' h '+(m%60)+' min';}
function fecha(t){try{return new Date(t).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return new Date(t).toISOString();}}
function texto(){
  const r=resumen(),L=[];
  L.push('La Milpa · mi opinión ('+(NOMBRE[ronda]||'sin ronda')+')');
  [...PRIMERAS,...FINALES].forEach(k=>{if(P[k].solo&&P[k].solo!==ronda)return;L.push('· '+P[k].q+' '+(reg.resp[k]||'(sin respuesta)'));});
  if(reg.resp.comentario)L.push('· Comentario: '+reg.resp.comentario.trim());
  L.push('');L.push('— Registro del juego —');
  const total=reg.sesiones.reduce((a,s)=>a+s[1],0),dias=new Set(reg.sesiones.map(s=>new Date(s[0]).toDateString())).size;
  const n=reg.sesiones.length;
  L.push('Desde el '+fecha(reg.inicio)+' · entré '+n+(n===1?' vez':' veces')+' · '+dias+(dias===1?' día':' días distintos')+' · '+dur(total)+' en total');
  if(r.dia)L.push('Día de juego '+r.dia+' · '+r.parcelas+' de '+r.total+' parcelas · troje en el piso '+r.piso+' · '+r.mazorcas+' mazorcas · '+r.tipos+' tipos de maíz · sucesos vistos: '+r.sucesos+' de '+r.sucesosTotal);
  Object.keys(reg.juegos).forEach(k=>{const j=reg.juegos[k];L.push(k+': '+j.n+' terminados'+(j.n?', '+dur(j.s/j.n)+' en promedio':'')+(j.sin?' · '+j.sin+' sin terminar':''));});
  L.push('');
  L.push('datos:'+JSON.stringify({v:1,ronda,inicio:reg.inicio,ses:reg.sesiones,juegos:reg.juegos,pant:reg.pantallas,r,resp:reg.resp}));
  return L.join('\n');}
function enviar(h){
  const t=texto();reg.enviado=Date.now();guardarReg();
  const salida=el('textarea','salida');salida.id='mp-salida';salida.readOnly=true;salida.value=t;
  const aviso=el('p','mp-nota','');
  const f=el('div','mp-fila');
  const copiar=el('button','mp-btn','Copiar');copiar.type='button';
  copiar.addEventListener('click',()=>{const ok=()=>{aviso.textContent='Copiado. Pégalo en un mensaje para Luis.';};
    try{navigator.clipboard.writeText(t).then(ok,()=>{salida.focus();salida.select();aviso.textContent='Selecciona el texto y cópialo.';});}catch(e){salida.focus();salida.select();aviso.textContent='Selecciona el texto y cópialo.';}});
  f.append(copiar);
  if(navigator.share){const comp=el('button','mp-btn prim','Compartir');comp.type='button';
    comp.addEventListener('click',()=>{navigator.share({title:'La Milpa · mi opinión',text:t}).then(()=>{aviso.textContent='¡Gracias!';},()=>{aviso.textContent='Si no se abrió, usa Copiar.';});});
    f.append(comp);}
  h.innerHTML='';
  h.append(el('h2',null,'¡Gracias!'),el('p',null,'Manda este texto a Luis por el chat que uses con él (WhatsApp, mensaje, correo).'),salida,aviso,f);
  const cer=el('button','mp-btn','Cerrar');cer.type='button';cer.addEventListener('click',()=>{const v=h.parentNode;if(v)v.remove();});f.prepend(cer);}

/* ---------- cuándo preguntar ---------- */
let btnOpinion=null;
function revisarMomentos(tipo){
  if(!api||!ronda||tipo!=='monte')return;
  const est=api.est();
  setTimeout(()=>{
    if(!api||api.pantalla()!=='monte'||document.querySelector('.mp-velo'))return;
    if(!reg.resp._primeras&&est.contadores.cosechas>=1&&api.aprendizaje()==='libre'){reg.resp._primeras=1;guardarReg();hojaPrimeras();return;}
    if(!reg.invitado&&!reg.enviado){
      const horas=(Date.now()-reg.inicio)/36e5,jugados=Object.values(reg.juegos).reduce((a,j)=>a+j.n,0);
      const listo=ronda==='a'?(est.troje.piso>=2||(horas>=2&&jugados>=12)):horas>=24*6;
      if(listo){reg.invitado=Date.now();guardarReg();hojaInvitacion();}}
  },1400);}

/* ---------- la app instalada sin ronda: preguntar una vez ---------- */
function instalada(){try{return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;}catch(e){return false;}}
function elegirSiHaceFalta(){
  if(ronda||!instalada()||ls.get('milpa.prototipo.v1'))return Promise.resolve();
  return new Promise(ok=>{
    const app=document.getElementById('app');if(!app){ok();return;}
    ponerEstilos();
    const v=el('div','mp-velo'),h=el('div','mp-hoja');v.style.zIndex='12';v.style.alignItems='center';v.append(h);app.append(v);
    h.append(el('h2',null,'¿Cómo te pidió Luis que lo probaras?'));
    const f=el('div','mp-ops');
    [['a','Un día, entrando seguido'],['b','Una semana, una o dos veces al día']].forEach(([r,t])=>{
      const b=el('button',null,t);b.type='button';b.addEventListener('click',()=>{fijarRonda(r);ronda=r;v.remove();ok();});f.append(b);});
    h.append(f);});}

/* ---------- lo que index.html llama ---------- */
window.MilpaPrueba={
  get ronda(){return ronda;},
  get amigo(){return !!ronda;},
  get reloj(){return ronda?RELOJ[ronda]:null;},
  recienLlegado:enlace==='a'||enlace==='b',
  elegirSiHaceFalta,
  iniciar(a){
    api=a;if(!ronda)return;
    api.app.classList.add('amigo');ponerEstilos();cargarReg();abrirSesion();vigilarSesiones();
    btnOpinion=el('button',null,'Tu opinión');btnOpinion.id='mp-opinion';btnOpinion.type='button';btnOpinion.hidden=true;
    btnOpinion.addEventListener('click',hojaOpinion);api.app.append(btnOpinion);
    const t=api.pantalla();if(t)this.pantalla(t,null);},
  pantalla(tipo,de){
    if(!reg)return;
    reg.pantallas[tipo]=(reg.pantallas[tipo]||0)+1;
    if(de==='juego'&&juego&&!juego.hecho){sumaJuego(juego.k,'sin',1);juego=null;}
    if(btnOpinion)btnOpinion.hidden=!['monte','parcela','troje'].includes(tipo);
    guardarReg();revisarMomentos(tipo);},
  juegoEmpieza(d){if(!reg)return;juego={k:claveJuego(d),t0:Date.now(),hecho:false};},
  juegoTermina(d){if(!reg||!juego)return;juego.hecho=true;
    const s=Math.min(20*60,(Date.now()-juego.t0)/1000);sumaJuego(juego.k,'n',1);sumaJuego(juego.k,'s',Math.round(s));guardarReg();},
};
})();
