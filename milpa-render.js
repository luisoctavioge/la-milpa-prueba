// La Milpa · el motor de dibujo de la milpa (vista desde arriba): generador de parcelas, luz de la hora, estaciones,
// fauna, lluvia, relámpago, troje y estados. Lo usan milpa-tu-milpa.html y milpa-pantallas.html. Sin DOM al cargar.
/* ================= utilidades ================= */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const W=180, H=(typeof window!=='undefined'&&window.MILPA_H)||300, OY=(typeof window!=='undefined'&&window.MILPA_OY)||0;  /* la página puede pedir un mapa más alto (pantallas de teléfono) */
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

/* materiales: 0 monte, 1 milpa verde, 2 madura, 3 tierra, 4 ceniza, 5 piedra, 6 troje, 7 maleza, 8 patio */
const RAMP={0:['#0E2E1C','#2F8A45'],1:['#2F7A3A','#B5DC4E'],2:['#8A5F10','#F2C230'],3:['#6A2214','#D0562F'],4:['#3A3936','#ADA89C'],5:['#4E4C46','#E6E8EC'],6:['#7A2A14','#F2C230'],7:['#1F5A2E','#74B84A'],8:['#7A5A2A','#E3C072']};
const RAMPc={};for(const k in RAMP)RAMPc[k]=RAMP[k].map(hex);
const DEEP=hex('#0A1F14');

/* ================= la luz de la hora (paletas planas por hora, como "El monte desde arriba") ================= */
const PAL={
 noche:{monteFondo:'#14244A',copa:'#1E3A62',copaLuz:'#2E5A8C',verde:'#3E6F80',surcoVerde:'#2C5666',madura:'#8E7E50',surcoMadura:'#6C5C34',tierra:'#6E4052',surcoTierra:'#50303E',ceniza:'#4C5064',cenizaLinea:'#3A3D4E',maleza:'#1E3A62',patio:'#4E4C68',troje:'#F2B544',trojeLinea:'#A8641A',piedra:'#9098AE',piedraBaja:'#3A4056',sombra:'#0A1430'},
 manana:{monteFondo:'#1B5545',copa:'#2A7058',copaLuz:'#55A88A',verde:'#93C98C',surcoVerde:'#4E9466',madura:'#E9D27A',surcoMadura:'#A88A3A',tierra:'#C2705E',surcoTierra:'#93483A',ceniza:'#A4A6A4',cenizaLinea:'#7A7E80',maleza:'#2A7058',patio:'#D8C79A',troje:'#E9D27A',trojeLinea:'#8E6A2E',piedra:'#EEF2F4',piedraBaja:'#5E7A70',sombra:'#123A40'},
 mediodia:{monteFondo:'#1F5A34',copa:'#2E7E42',copaLuz:'#59B04E',verde:'#ADD652',surcoVerde:'#62A032',madura:'#F0C43A',surcoMadura:'#B57A12',tierra:'#C9583A',surcoTierra:'#94381F',ceniza:'#A09B91',cenizaLinea:'#726E66',maleza:'#2E7E42',patio:'#DCC07A',troje:'#F0C43A',trojeLinea:'#8E5A0E',piedra:'#F2F3F4',piedraBaja:'#6E7A66',sombra:'#143A20'},
 tarde:{monteFondo:'#245F35',copa:'#33803F',copaLuz:'#8CC63F',verde:'#BEDB4C',surcoVerde:'#6FA32E',madura:'#F2C230',surcoMadura:'#B57A12',tierra:'#CF5B34',surcoTierra:'#93371F',ceniza:'#A69C8A',cenizaLinea:'#76705F',maleza:'#33803F',patio:'#E3C072',troje:'#F2C230',trojeLinea:'#8E5A0E',piedra:'#EEF0F2',piedraBaja:'#6E7650',sombra:'#14301A'},
 dorada:{monteFondo:'#2A4F33',copa:'#3C6E3E',copaLuz:'#D9A23F',verde:'#C9C24A',surcoVerde:'#8E9A2E',madura:'#F2A830',surcoMadura:'#B0661A',tierra:'#D9542E',surcoTierra:'#9A3420',ceniza:'#AE927E',cenizaLinea:'#7E6656',maleza:'#3C6E3E',patio:'#E8B060',troje:'#F2A830',trojeLinea:'#8E4A0E',piedra:'#F2D9C4',piedraBaja:'#7A5A44',sombra:'#2A1E30'}
};
const PODRIDA=hex('#8C6B45'), HUECO=[110,80,52];  /* Podrida: pardo con huecos (Luis, 18 nov) */
const PALc={};for(const k in PAL){PALc[k]={};for(const n in PAL[k])PALc[k][n]=hex(PAL[k][n]);const P=PALc[k];P.pasto=mix(P.verde,P.patio,.55);P.pastoMata=mix(P.verde,P.surcoVerde,.5);P.marchita=mix(P.madura,P.ceniza,.65);P.surcoMarchita=mix(P.surcoMadura,P.cenizaLinea,.6);P.pasada=mix(P.madura,P.marchita,.45);P.teja=mix(P.tierra,P.surcoTierra,.25);P.lamina=mix(P.piedra,P.ceniza,.55);P.madera=mix(P.surcoMadura,P.trojeLinea,.5);P.agua=mix(P.sombra,[60,110,150],.55);P.surcoPasada=mix(P.surcoMadura,P.surcoMarchita,.45);}
const KEYS=[[0,'noche'],[5.4,'noche'],[6.6,'dorada'],[8.2,'manana'],[12,'mediodia'],[16.4,'tarde'],[18.5,'dorada'],[19.8,'noche'],[24,'noche']];
function paleta(h){for(let i=0;i<KEYS.length-1;i++){const a=KEYS[i],b=KEYS[i+1];if(h>=a[0]&&h<=b[0]){const t=(h-a[0])/(b[0]-a[0]),A=PALc[a[1]],B=PALc[b[1]],o={};for(const n in A)o[n]=mix(A[n],B[n],t);return o;}}return PALc.noche;}
function momento(h){if(h<6)return['madrugada',false];if(h<12)return['mañana · lluvia 1',true];if(h<18)return['tarde · lluvia 2',true];if(h<24)return['noche temprana · lluvia 3',true];return['madrugada',false];}

/* ================= la milpa generada ================= */
const ORDEN=[4,6,8,10,3,5,9,11,1,13,0,2,12,14]; const TROJE=7;
const ESTADOS=['verde','vacia','madura','sembrada','vacia','descuidada','madura','ceniza','creciendo','vacia','marchita'];
const MODOS={reticula:{n:'Retícula deformada',jit:6,met:'cheb',warp:0,lim:31},poligonos:{n:'Polígonos',jit:12,met:'eu',warp:0,lim:34},organica:{n:'Campos orgánicos',jit:12,met:'eu',warp:5,lim:34}};
function generar(seed,modo='poligonos',construidas=11,estados=ESTADOS,niveles=null,opts={}){
  const R=rng(seed), M=MODOS[modo];
  const slots=[];for(let r=0;r<5;r++)for(let c=0;c<3;c++){const i=r*3+c, j=i===TROJE?3:M.jit;slots.push({x:32+58*c+(R()-.5)*2*j,y:34+OY+58*r+(R()-.5)*2*j,w:i===TROJE?1:.82+R()*.4,a:R()*Math.PI,s:'monte'});}
  slots.forEach(q=>q.L=1+((R()*4)|0));
  slots[TROJE].s='troje'; ORDEN.forEach((i,k)=>{if(k<construidas)slots[i].s=estados[k%estados.length];else if(k===construidas)slots[i].s='obra';if(niveles)slots[i].L=niveles[k%niveles.length];});
  const w1=R()*6,w2=R()*6;
  /* semillas de monte alrededor, para que el claro quede enmarcado por monte */
  const all=slots.slice();
  for(let r=-2;r<=6;r++){for(const c of [-1,3]){all.push({x:32+58*c+(R()-.5)*2*M.jit,y:34+OY+58*r+(R()-.5)*2*M.jit,w:1,s:'monte'});}}
  for(const r of [-2,-1,5,6])for(let c=0;c<3;c++){all.push({x:32+58*c+(R()-.5)*2*M.jit,y:34+OY+58*r+(R()-.5)*2*M.jit,w:1,s:'monte'});}
  const id=new Int8Array(W*H).fill(-1), edge=new Float32Array(W*H), own=new Int8Array(W*H).fill(-1);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let px=x,py=y; if(M.warp){px+=M.warp*Math.sin(y*.085+w1)+M.warp*.6*Math.sin((x+y)*.05+w2);py+=M.warp*Math.sin(x*.08+w2)+M.warp*.6*Math.sin((x-y)*.06+w1);}
    let b1=1e9,b2=1e9,bi=-1;
    for(let i=0;i<all.length;i++){const dx=px-all[i].x,dy=py-all[i].y;const d0=M.met==='cheb'?Math.max(Math.abs(dx),Math.abs(dy)*.95):Math.hypot(dx,dy);const d=d0/all[i].w;if(d<b1){b2=b1;b1=d;bi=i;}else if(d<b2)b2=d;}
    const p=y*W+x; if(bi<15)own[p]=bi;
    if(bi<15&&slots[bi].s!=='monte'&&slots[bi].s!=='perdida'){id[p]=bi;edge[p]=(b2-b1)*.9;}
  }
  /* alturas y materiales */
  const mat=new Uint8Array(W*H),h=new Float32Array(W*H),tex=new Uint8Array(W*H); const RR=rng(seed^0x9E37);
  for(let p=0;p<W*H;p++){h[p]=2.4+RR()*.3;}
  const trees=[];for(let i=0;i<1000;i++){const x=RR()*W,y=RR()*H,p=(y|0)*W+(x|0),o=own[p],joven=o>=0&&slots[o].s==='perdida',r=joven?1.4+RR()*1.8:2.5+RR()*4.5;if(id[p]<0)trees.push({x,y,r});}
  for(let i=0;i<500;i++){const x=RR()*W,y=RR()*H,p=(y|0)*W+(x|0),o=own[p];if(o>=0&&slots[o].s==='perdida')trees.push({x,y,r:1.4+RR()*1.8});}
  trees.forEach(t=>{const r=t.r*1.05;for(let y=Math.max(0,t.y-r|0);y<Math.min(H,t.y+r+1);y++)for(let x=Math.max(0,t.x-r|0);x<Math.min(W,t.x+r+1);x++){const p=y*W+x;if(id[p]>=0)continue;const d=((x-t.x)**2+(y-t.y)**2)/(r*r);if(d<1){const v=2.6+t.r*.75*Math.sqrt(1-d);if(v>h[p])h[p]=v;}}});
  const T=slots[TROJE];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x,i=id[p];if(i<0)continue;const s=slots[i];let m=1,v=.2;
    const u=x*Math.cos(s.a)+y*Math.sin(s.a), vv=-x*Math.sin(s.a)+y*Math.cos(s.a);
    const CULT={verde:[1,1.6],descuidada:[1,1.6],creciendo:[1,1.1],madura:[2,2.1],marchita:[10,1.4],pasada:[11,1.9]};
    if(CULT[s.s]){m=CULT[s.s][0];const row=((u%6)+6)%6<2, lleno=s.s==='creciendo'?(((vv%4)+4)%4<1.5):(((vv%4)+4)%4<3);v=row?(lleno?CULT[s.s][1]:.6):.2;}
    if(s.s==='vacia'){m=9;v=((x*13+y*7)%11<2)?.8:.2;}
    if(s.s==='perdida'){m=7;v=2+RR()*1.4;if(RR()<.3){m=0;v=2.8+RR()*1.6;}}
    if(s.s==='sembrada'){m=3;v=.35+.35*Math.sin(u*Math.PI/2.5);}
    if(s.L>1&&(CULT[s.s]||s.s==='sembrada')){const pu=(x-s.x)*Math.cos(s.a)+(y-s.y)*Math.sin(s.a);for(let b=1;b<s.L;b++){const bd=-32+b*64/s.L;if(Math.abs(pu-bd)<1.1){m=8;v=.1;}}}
    if(s.s==='ceniza'){m=4;v=.12+RR()*.15;}
    if(s.s==='obra'){const half=(x-s.x)*Math.cos(s.a)+(y-s.y)*Math.sin(s.a);if(half>0){id[p]=-1;h[p]=2.4+RR()*2.6;continue;}m=3;v=.3+.3*Math.sin(u*Math.PI/3);}
    if(s.s==='troje'){const q=trojePix(x,y,T,opts);m=q[0];v=q[1];tex[p]=q[2];}
    const e=edge[p];
    if(s.s==='descuidada'){m=12;v=2+RR()*1.4;if(RR()<.3)v=2.8+RR()*1.6;}
    if(e<1.6&&s.s!=='troje'){m=5;v=((x*7+y*13)%5<3)?1.6:.4;}
    mat[p]=m;h[p]=v;}
  /* el monte que asoma en la orilla del claro */
  for(let p=0;p<W*H;p++){if(id[p]<0)mat[p]=0;}
  /* lugares para la fauna */
  const borde=(sl,dir)=>{for(let dx=0;dx<90;dx++){const x=Math.round(sl.x+dir*dx),y=Math.round(sl.y);if(x<1||x>W-2)break;if(id[y*W+x]<0)return{x:clamp(x+dir*6,4,W-6),y};}return{x:sl.x,y:sl.y};};
  const madura=slots.find(q=>q.s==='madura')||slots[4];
  const verdes=slots.filter(q=>q.s==='verde');
  const spots={borde1:borde(slots[6],-1),borde2:borde(slots[8],1),madura,verdes};
  spots.vacias=slots.filter(q=>q.s==='vacia');
  return{slots,id,own,mat,h,tex,seed,modo,spots};
}


/* ================= la troje y su solar ================= */
let TROJE_VAR='casa', TROJE_PISO=4;
function trojePix(x,y,T,o){
  const V=o.troje||TROJE_VAR, piso=o.piso||TROJE_PISO, ra=.18, cs=Math.cos(ra), sn=Math.sin(ra);
  const loc=(cx,cy)=>{const dx=x+.5-(T.x+cx),dy=y+.5-(T.y+cy);return[dx*cs+dy*sn,-dx*sn+dy*cs];};
  const patio=[8,.15,0];
  const oval=(cx,cy,rx,ry,mat)=>()=>{const[a,b]=loc(cx,cy);if(a*a/(rx*rx)+b*b/(ry*ry)>=1)return null;const ryE=ry*Math.sqrt(Math.max(0,1-a*a/(rx*rx)));const t=Math.abs(b)/Math.max(.6,ryE);
    return[mat,2+5*(1-t)*Math.min(1,(rx-Math.abs(a))/3+.6),(Math.abs(b)%2.2<.7||Math.abs(b)<.8)?1:0];};
  const rect=(cx,cy,w,hh,mat,k)=>()=>{const[a,b]=loc(cx,cy);if(Math.abs(a)>=w/2||Math.abs(b)>=hh/2)return null;const t=Math.abs(b)/(hh/2);let l=0;
    if(k==='teja')l=(((a+40)%3)<1||(Math.abs(b)%2)<.6)?1:0; if(k==='lamina')l=((a+40)%2<.8)?1:0; if(k==='huano')l=(Math.abs(b)%2.2<.7)?1:0; if(k==='madera')l=((a+40)%2.4<.8)?1:0;
    if(Math.abs(b)<.7)l=1; return[mat,2+4*(1-t),l];};
  const circ=(cx,cy,r,mat,hh)=>()=>{const[a,b]=loc(cx,cy);return Math.hypot(a,b)<r?[mat,hh,0]:null;};
  const pozo=(cx,cy)=>()=>circ(cx,cy,1.6,17,.1)()||circ(cx,cy,3,5,1.4)();
  const arbol=(cx,cy)=>()=>{const[a,b]=loc(cx,cy);const d=Math.hypot(a,b);return d<5?[0,2.8+3*Math.sqrt(1-d*d/25),0]:null;};
  const veleta=(cx,cy)=>()=>{const[a,b]=loc(cx,cy);const d=Math.hypot(a,b);if(d<=1.2)return[15,9,1];if(d<6.5){const g=Math.atan2(b,a);if(Math.sin(g*9)>.2||d>5.6)return[15,8.5,d>5.6?1:0];}return null;};
  let F=[];
  if(V==='casa'){                       /* casa maya con su solar: crece con los pisos de la troje */
    if(piso>=5)F.push(veleta(-16,13));
    F.push(oval(-6,-4,15,8.5,13), rect(15,-13,9,7,13,'huano'));        /* la casa y el ch'iil (la troje) */
    if(piso>=2)F.push(oval(12,12,7,4.5,13));                             /* la cocina */
    if(piso>=3)F.push(pozo(-16,13));                                     /* el pozo */
    if(piso>=4)F.push(arbol(-2,17), rect(-17,-17,7,5,16,'madera'));      /* el naranjo y el gallinero */
  }
  if(V==='adobe')F.push(rect(-4,-3,26,15,14,'teja'), rect(15,12,8,6,14,'teja'), pozo(-15,14), arbol(16,-14));
  if(V==='lamina')F.push(veleta(-14,14), rect(-5,-4,24,14,15,'lamina'), rect(14,12,9,6,15,'lamina'), pozo(-14,14));
  if(V==='chiil')F.push(rect(0,0,14,10,13,'huano'), arbol(14,12));
  if(V==='cuexcomate'){const d=Math.hypot(x+.5-T.x,y+.5-T.y);return d<14.5?[6,1.2+7*Math.sqrt(1-(d/14.5)**2)+(Math.sin(Math.atan2(y-T.y,x-T.x)*16)>.6?.4:0),0]:patio;}
  for(const fn of F){const q=fn();if(q)return q;}
  return patio;
}
/* ================= las estaciones (4 semanas, iguales para todos, por fecha) ================= */
const ESTS=[null,
 {n:'Primavera',s:'verdes tiernos y el monte en flor', mods:{verde:[[214,238,150],.42],surcoVerde:[[160,210,100],.3],copa:[[100,170,100],.22],copaLuz:[[200,230,160],.4],monteFondo:[[60,120,70],.2],pasto:[[215,232,160],.4]}, flor:[229,139,180]},
 {n:'Verano', s:'todo verde, el monte lleno',        mods:{verde:[[70,165,50],.38],surcoVerde:[[30,110,35],.35],copa:[[15,85,35],.32],copaLuz:[[60,150,55],.3],monteFondo:[[8,55,28],.3],pasto:[[110,175,70],.4]}},
 {n:'Otoño',  s:'el campo se dora, el monte se seca',mods:{verde:[[210,180,85],.55],surcoVerde:[[155,130,55],.5],copa:[[135,120,55],.5],copaLuz:[[210,175,80],.55],monteFondo:[[85,72,40],.4],pasto:[[220,188,120],.55],maleza:[[135,120,55],.4]}},
 {n:'Invierno',s:'hojas rojas y amarillas en el monte',mods:{copa:[[150,85,45],.35],copaLuz:[[215,150,65],.4],verde:[[195,200,90],.22],monteFondo:[[70,55,35],.2],pasto:[[205,180,110],.3]}, flor:[217,84,46], flor2:[242,168,48]}
];
let EST_MODO='fecha';
function estacionHoy(){const d=new Date(),base=new Date(2026,0,5);const sem=Math.floor((d-base)/(7*864e5));return ((sem%4)+4)%4+1;}
const ESTACION=()=>EST_MODO==='fecha'?estacionHoy():EST_MODO;
function estacionar(P,est,day){const E=ESTS[est];if(!E)return P;const o={...P},k=.35+.65*day;for(const n in E.mods){if(!o[n])continue;const [c,a]=E.mods[n];o[n]=mix(o[n],c.map(v=>v*(.45+.55*day)),a*k);}return o;}
/* ================= sombras y color ================= */
function sombrear(G,hour,est){est=est||ESTACION();
  const {h}=G;const g=(x,y)=>h[clamp(y,0,H-1)*W+clamp(x,0,W-1)];
  const day=smooth(5.8,7,hour)*(1-smooth(18.6,19.8,hour));
  const s=clamp((hour-6)/13), lx=Math.cos(Math.PI*s), ly=.35, elev=Math.sin(Math.PI*s), slope=.1+elev*1.0;
  const sh=new Uint8Array(W*H), face=new Float32Array(W*H);
  const fx=day>.5?lx:-.6, fy=day>.5?ly:-.6;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x;const hx=g(x+1,y)-g(x-1,y),hy=g(x,y+1)-g(x,y-1);
    face[p]=hx*fx+hy*fy;
    if(day>.15){for(let k=1;k<20;k++){if(g(Math.round(x+lx*k),Math.round(y+ly*k))>h[p]+k*slope){sh[p]=1;break;}}}}
  return{sh,face,P:estacionar(paleta(hour),est,day),day,night:1-day,lx,ly,est,lluvia:0,hum:0,espera:false};
}
function pintar(cv,G,S,t,hour){
  const ctx=cv.getContext('2d');const img=ctx.createImageData(W,H),d=img.data;const P=S.P;
  const T=G.slots[TROJE]; const lluvia=momento(hour)[1]; const nx=((t*12)%(W+140))-70, ny=H*.4;
  const glow=hex('#F2B544'), NUBLADO=(S.espera>0&&(S.esperaModo||'').includes('luz'));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x,m=G.mat[p],hh=G.h[p];let c;
    if(m===0){c=hh<2.75?P.monteFondo:(S.face[p]>.55?P.copaLuz:P.copa);const E=ESTS[S.est];if(E&&E.flor&&hh>3.1){const q=((x*73856093)^(y*19349663))>>>0;if(q%7===0)c=mix(E.flor,P.sombra,S.night*.5);else if(E.flor2&&q%11===0)c=mix(E.flor2,P.sombra,S.night*.5);}}
    else if(m===7){c=hh<2.2?P.surcoVerde:(S.face[p]>.5?P.copaLuz:P.maleza);}
    else if(m>=13&&m<=17){const k=m-13;const base=[P.troje,P.teja,P.lamina,P.madera,P.agua][k],lin=[P.trojeLinea,P.surcoTierra,P.cenizaLinea,P.trojeLinea,P.sombra][k];c=G.tex[p]?lin:base;if(S.face[p]<-.6)c=mix(c,P.sombra,.22);else if(S.face[p]>.6)c=mix(c,[255,255,255],.08);}
    else if(m===12){c=hh<2.2?P.surcoVerde:(S.face[p]>.5?P.copaLuz:(hh>2.75?P.copa:P.maleza));c=mix(c,mix(PODRIDA,P.sombra,S.night*.45),.55);if((x*7+y*11)%13<2)c=mix(c,mix(HUECO,P.sombra,S.night*.45),.6);}
    else if(m===1)c=hh>1?P.surcoVerde:P.verde;
    else if(m===2)c=hh>1?P.surcoMadura:P.madura;
    else if(m===3)c=hh>.45?P.tierra:P.surcoTierra;
    else if(m===4)c=((x+y)%5<1)?P.cenizaLinea:P.ceniza;
    else if(m===5)c=hh>1?P.piedra:P.piedraBaja;
    else if(m===6){const a=Math.atan2(y-T.y,x-T.x);c=(Math.sin(a*16)>.6||Math.hypot(x-T.x,y-T.y)<3)?P.trojeLinea:P.troje;if(S.face[p]<-.9)c=mix(c,P.sombra,.25);}
    else if(m===9)c=hh>.5?P.pastoMata:P.pasto;
    else if(m===10)c=hh>1?P.surcoMarchita:P.marchita;
    else if(m===11)c=hh>1?P.surcoPasada:P.pasada;
    else c=P.patio;
    if(S.hum>0&&m!==0&&m!==5&&m!==6&&(m<13||m>16))c=mix(c,c.map(v=>v*.8),S.hum*.6);   /* tierra mojada */
    if(S.lluvia>0)c=mix(c,P.sombra,.08*S.lluvia);
    /* sombra proyectada: plana, con una trama fina solo adentro */
    if(S.sh[p]){const scr=(Math.cos(Math.PI*(x+y)/2)*Math.cos(Math.PI*(x-y)/2)+1)/2;c=mix(c,P.sombra,(scr>.5?.5:.38)*S.day*(NUBLADO?1-.8*S.espera:1));}
    if(NUBLADO){const g=(c[0]+c[1]+c[2])/3;c=mix(c,[g,g,g],.28*S.espera);c=mix(c,[150,166,186],.1*S.espera);}
    if(S.night>0){const dd=((x-T.x)**2+(y-T.y)**2)/(36*36);const gw=S.night*Math.exp(-dd*1.5);if(gw>.02)c=mix(c,glow,Math.min(.55,gw*.6));}
    const n=(Math.random()-.5)*7;
    d[p*4]=clamp(c[0]+n,0,255);d[p*4+1]=clamp(c[1]+n,0,255);d[p*4+2]=clamp(c[2]+n,0,255);d[p*4+3]=255;}
  const off=pintar.off||(pintar.off=Object.assign(document.createElement('canvas'),{width:W,height:H}));
  if(FAUNA)fauna(d,G,S,t,hour);
  nubes(d,G,S,t);
  if(S.flash>0)relampago(d,S);
  if(G.principal)orillas(d);
  off.getContext('2d').putImageData(img,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,cv.width,cv.height);
}


/* ================= la fauna: chica, en grupos ================= */
let FAUNA=true, EVENTO=null, PERDIDAS=0;
/* ================= los sucesos extraños (Luis, 19 nov): un monte para mirar con calma; de vez en cuando pasa algo ================= */
let SUCESO=null;   /* {tipo, t0, dur, r} */
const SUCESOS={
  brujas:{n:'Las brujas',s:'bolas de luz que flotan sobre el monte',noche:true,dur:24},
  ovni:{n:'Una luz en el cielo',s:'se detuvo sobre una parcela y se fue',noche:true,dur:18},
  nahual:{n:'El perro negro',s:'llegó hasta la troje y desapareció',noche:true,dur:20},
  chupacabras:{n:'El chupacabras',s:'se llevó una oveja',noche:true,dur:16},
  remolino:{n:'El remolino',s:'un torbellino de polvo cruzó la milpa',dia:true,dur:14},
  vibora:{n:'La víbora',s:'cruzó entre las parcelas',dia:true,dur:16}};
function puntoDeMonte(G,R){for(let k=0;k<200;k++){const x=6+R()*(W-12),y=6+R()*(H-12),p=(y|0)*W+(x|0);if(G.id[p]<0&&G.mat[p]===0)return{x,y};}return{x:W*.2,y:H*.2};}
function suceso(set,G,S,t,P){
  const s=SUCESO,e=t-s.t0;if(e<0)return;if(e>s.dur){SUCESO=null;return;}
  const R=rng(s.r),fade=Math.max(0,Math.min(1,e/1.5,(s.dur-e)/1.5)),T=G.slots[TROJE];
  const brillo=(x,y,c,rad,a)=>{for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){const d=Math.hypot(dx,dy)/rad;if(d<=1)set(x+dx,y+dy,c,a*(1-d)*(1-d));}};
  if(s.tipo==='brujas'){const abiertas=G.slots.filter(q=>q.s!=='monte'&&q.s!=='perdida'),base=abiertas[Math.floor(R()*abiertas.length)]||G.slots[TROJE];
    for(let k=0;k<3;k++){const ph=R()*6,x=base.x+Math.sin(e*.35+ph)*16+(k-1)*9,y=base.y+Math.cos(e*.27+ph*2)*10+Math.sin(e*2.3+k)*1.2;
      const fl=(.65+.35*Math.sin(e*11+k*3))*fade;brillo(x,y,[255,140,50],6,.18*fl);brillo(x,y,[255,190,90],2,.7*fl);set(x,y,[255,236,190],fl);}}
  else if(s.tipo==='ovni'){const sl=G.slots[[4,6,8,10,3,5][Math.floor(R()*6)]],hx=sl.x,hy=sl.y;let x,y;
    if(e<6){const k=e/6,q=1-Math.pow(1-k,3);x=-8+(hx+8)*q;y=H*.15+(hy-H*.15)*q;}
    else if(e<15){x=hx+Math.sin(e*1.3)*1.5;y=hy+Math.cos(e*.9)*1;const pulso=.5+.5*Math.sin(e*4);brillo(hx,hy,[200,255,225],11,.32*(e<7?e-6:e>14?15-e:1)*(.7+.3*pulso));}
    else{const k=(e-15)/1.2;x=hx+k*k*260;y=hy-k*k*200;}
    brillo(x,y,[220,255,240],4,.45*fade);set(x-1,y,[245,255,250],fade);set(x,y,[255,255,255],fade);set(x+1,y,[245,255,250],fade);
    if(Math.sin(e*7)>0)set(x+2,y,[255,90,80],fade);else set(x-2,y,[120,200,255],fade);}
  else if(s.tipo==='nahual'){const A=G.spots.borde2,B={x:T.x+14,y:T.y+6};let x,y,a=fade;
    if(e<7){const k=e/7;x=A.x+(B.x-A.x)*k;y=A.y+(B.y-A.y)*k;}else{x=B.x;y=B.y;}
    if(e>14)a=Math.max(0,1-(e-14)/3);
    const negro=[10,8,14],dir=B.x<A.x?-1:1,paso=e<7&&Math.floor(e*6)%2;
    [[0,0],[1,0],[2,0],[0,1],[2,1],[3,-1],[3,0],[-1,-1]].forEach(([dx,dy],i)=>{if(i===3&&paso)return;set(x+(dir>0?dx:2-dx),y+dy,negro,a);});
    if(e>7.5&&e<14.5&&Math.sin(e*5)>-.6){const ox=dir>0?x+3:x-1;set(ox,y-1,[255,60,40],a);brillo(ox,y-1,[255,60,40],2,.35*a);}}
  else if(s.tipo==='remolino'){const sl=G.slots[[4,6,8,10,3,5,9,11][Math.floor(R()*8)]],cx=sl.x-14+e*2.2,cy=sl.y+Math.sin(e*.6)*5;
    for(let i=0;i<22;i++){const r=1+(i%7)*.95,an=e*(9-i*.15)+i*1.7;set(cx+Math.cos(an)*r,cy+Math.sin(an)*r*.75-i*.12,[228,206,150],.8*fade);}
    for(let i=0;i<3;i++){const an=e*5+i*2.1,r=6+i;set(cx+Math.cos(an)*r,cy+Math.sin(an)*r*.7,[96,150,60],.9*fade);}}
  else if(s.tipo==='vibora'){const y0=T.y+(R()<.5?-30:30),x0=-6,vx=(W+12)/s.dur;
    for(let i=0;i<9;i++){const x=x0+e*vx-i*1.1,y=y0+Math.sin(e*4-i*.8)*1.6;set(x,y,i===0?[60,52,30]:(i%2?[150,120,60]:[96,80,40]),fade);}}
}
const AVE={pajaro:[["x...x",".x.x.","..x.."],["..x..",".xxx.","x...x"]],zopilote:[["xx.....xx",".xxx.xxx.","...xxx...","....x...."]]};
const C={blanco:hex('#F2F2EC'),negro:hex('#1C1A1E'),cafe:hex('#7A4A26'),cafeClaro:hex('#A8743E'),rojo:hex('#C8302A'),pinto:hex('#3A2A20'),perro:hex('#C9A26A'),ave:hex('#1E1E22'),zopi:hex('#16161A'),amarillo:hex('#F7D23A'),luz:hex('#E8FF7A'),bicho:hex('#141018'),ojo:hex('#FF3B30')};
function fauna(d,G,S,t,hour){
  const P=S.P, T=G.slots[TROJE], sp=G.spots;
  const set=(x,y,c,a=1)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;if(G.id[y*W+x]<0)return;   /* animales y sucesos solo sobre las parcelas y la troje, nunca sobre el monte (Luis, 19 nov) */
    const i=(y*W+x)*4;const m=mix([d[i],d[i+1],d[i+2]],c,a);d[i]=m[0];d[i+1]=m[1];d[i+2]=m[2];};
  const tono=c=>mix(c,P.sombra,S.night*.45);
  const punto=(x,y,c,som=1)=>{if(S.day>.2&&som)set(x-S.lx*som+.6,y-S.ly*som+.6,P.sombra,.4*S.day);set(x,y,tono(c));};
  const grupo=(cx,cy,n,rad,k)=>{const R=rng(G.seed^k);return Array.from({length:n},()=>({dx:(R()-.5)*2*rad,dy:(R()-.5)*2*rad,ph:R()*6}));};
  const en=(a,b)=>hour>=a&&hour<b, dia=en(6.5,18.8), vac=sp.vacias;
  /* vacas: pastan en una parcela vacía */
  const resguardo=S.espera>0&&(S.esperaModo||'').includes('animales');
  if(dia&&vac[0])grupo(0,0,6,12,11).forEach((q,i)=>{const jj=resguardo?.4:1;const x=vac[0].x+q.dx*jj+Math.sin(t*.05+q.ph)*3*jj,y=vac[0].y+q.dy*jj+Math.cos(t*.04+q.ph)*2*jj;punto(x,y,C.blanco);punto(x+(i%2),y+(1-i%2),i%3?C.cafe:C.negro);});
  /* un caballo y un burro */
  const vc=vac[2]||vac[0];if(dia&&vc){punto(vc.x+8+Math.sin(t*.04)*3,vc.y-6,C.cafe);punto(vc.x+9+Math.sin(t*.04)*3,vc.y-6,C.cafe);punto(vc.x-6,vc.y+8+Math.cos(t*.05)*2,C.pinto);}
  /* borregos: de día pastan en otra vacía; de noche se juntan junto a la troje */
  const corral={x:T.x-22,y:T.y+20}; const vb=vac[1]||vac[0]||corral;
  const ob=grupo(0,0,12,1,22); const nOv=12-PERDIDAS;
  let robada=-1; if(EVENTO&&G.principal){robada=nOv-1;}
  ob.slice(0,nOv).forEach((q,i)=>{if(i===robada&&EVENTO.lleva)return;
    let x,y; if(dia&&!resguardo){x=vb.x+q.dx*10+Math.sin(t*.03)*5+Math.sin(t*.2+q.ph)*.6;y=vb.y+q.dy*8+Math.cos(t*.025)*4;} else {x=corral.x+q.dx*5;y=corral.y+q.dy*4;}
    punto(x,y,C.blanco);});
  /* guajolotes y gallinas alrededor de la troje */
  if(dia){grupo(0,0,4,16,33).forEach((q,i)=>punto(T.x+q.dx+(q.dx>0?8:-8)+Math.sin(t*.4+q.ph),T.y+q.dy+Math.cos(t*.3+q.ph),i?C.negro:C.rojo));
    grupo(0,0,5,18,44).forEach(q=>punto(T.x+q.dx+(q.dx>0?6:-6)+Math.sin(t*.6+q.ph),T.y+q.dy+Math.cos(t*.5+q.ph),C.blanco));}
  /* el perro, junto a la troje */
  punto(T.x+15,T.y+13,C.perro);punto(T.x+16,T.y+13,C.perro);
  /* venados: al amanecer y al atardecer, en la orilla del monte */
  if(en(5.4,8.2)||en(17,19.8))[sp.borde1,sp.borde2].forEach((b,i)=>{const x=b.x+Math.sin(t*.2+i)*2,y=b.y+i*4;punto(x,y,C.cafeClaro);punto(x,y+1,C.cafeClaro);set(x,y+2,tono(C.blanco));});
  /* tejones en la parcela madura */
  if(en(8,17))grupo(0,0,3,6,55).forEach(q=>punto(sp.madura.x+q.dx+Math.cos(t*.35+q.ph)*5,sp.madura.y+q.dy+Math.sin(t*.35+q.ph)*4,C.cafe));
  /* zanates: parvadas que cruzan por cualquier lado, en direcciones y tamaños al azar, con pausas (Luis, 19 nov) */
  if(en(6.2,19)&&!resguardo)for(let k=0;k<3;k++){
    const per=24+k*9,u=t+k*13.7,c=Math.floor(u/per),f=(u%per)/per;if(hh(k*7+1,c)<.3)continue;     /* a veces no pasa ninguna */
    const a=hh(k*13+2,c)*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a),cx=W/2+(hh(k*5+3,c)-.5)*W*.7,cy=H/2+(hh(k*5+4,c)-.5)*H*.7;
    const largo=Math.hypot(W,H)*.7,px=cx+dx*(f-.5)*2*largo,py=cy+dy*(f-.5)*2*largo,n=2+Math.floor(hh(k*3+5,c)*6);
    for(let b=0;b<n;b++){const lado=b%2?1:-1,fila=Math.ceil(b/2);
      const x=px-dx*fila*5-dy*lado*fila*4+Math.sin(t*.9+b)*1.2,y=py-dy*fila*5+dx*lado*fila*4+Math.cos(t*.8+b)*1.2,fr=Math.floor(t*6+b)%2;
      AVE.pajaro[fr].forEach((row,j)=>[...row].forEach((ch,q)=>{if(ch==='.')return;if(S.day>.2)set(x+q-S.lx*14+8,y+j-S.ly*14+10,P.sombra,.3*S.day);set(x+q,y+j,tono(C.ave));}));}}
  /* (sin zopilote: se veía gigante; Luis, 19 nov) */
  /* mariposas: un punto amarillo que parpadea */
  if(en(10,15.5))(sp.verdes||[]).slice(0,3).forEach((v,i)=>{if(Math.sin(t*9+i)>-.2)set(v.x+Math.sin(t*.9+i*2)*10,v.y+Math.cos(t*.7+i)*8,C.amarillo);});
  /* luciérnagas */
  if(S.night>.5){const R=rng(G.seed^0x51ED);for(let i=0;i<46;i++){const x=R()*W,y=R()*H,ph=R()*6;if(Math.sin(t*1.6+ph*3)<=.55)continue;
    const xx=x+Math.sin(t*.3+ph)*4,yy=y+Math.cos(t*.25+ph)*4;set(xx,yy,C.luz);set(xx+1,yy,C.luz,.45);set(xx-1,yy,C.luz,.45);set(xx,yy+1,C.luz,.45);set(xx,yy-1,C.luz,.45);}}
  /* SUCESOS EXTRAÑOS (19 nov): raros, solo para quien está mirando */
  if(SUCESO&&G.principal)suceso(set,G,S,t,P);
  /* EVENTO RARO: de noche, el chupacabras sale del monte y se roba una oveja */
  if(EVENTO&&G.principal){const e=t-EVENTO.t0, A=sp.borde1, B={x:corral.x-3,y:corral.y};let x,y;
    if(e<7){x=A.x+(B.x-A.x)*e/7;y=A.y+(B.y-A.y)*e/7;EVENTO.lleva=false;}
    else if(e<8.5){x=B.x;y=B.y;EVENTO.lleva=true;}
    else if(e<16){const k=(e-8.5)/7.5;x=B.x+(A.x-B.x)*k;y=B.y+(A.y-B.y)*k;EVENTO.lleva=true;}
    else {PERDIDAS=Math.min(11,PERDIDAS+1);EVENTO=null;return;}
    set(x,y,C.bicho);set(x+1,y,C.bicho);set(x,y+1,C.bicho);set(x+1,y+1,C.bicho);
    if(Math.sin(t*7)>-.3)set(x+1,y,C.ojo);
    if(EVENTO&&EVENTO.lleva)set(x-1,y+1,tono(C.blanco));}
}
/* ================= los estados y los niveles, recortados de una milpa ================= */
const EST=[['monte','Monte','sin abrir'],['obra','Se abre','la quema abre la parcela'],['ceniza','Quemada','con ceniza por 3 cosechas'],['vacia','Vacía','pastan los animales'],['sembrada','Sembrada','espera la primera lluvia'],['creciendo','Creciendo','ya llovió'],['verde','Milpa','crece con las lluvias'],['madura','Lista','para cosechar'],['pasada','Lista, día 2','pierde calidad'],['marchita','Marchita','día 3: se perdió la cosecha'],['descuidada','Podrida','la maleza la cubre'],['perdida','Perdida','de nuevo monte']];
/* las milpas de muestra se generan al usarlas (generar al cargar cuesta en un teléfono) */
let GEST=null, GNIV=null, GTV=null, GTP=null;
function muestras(){if(!GEST)GEST=generar(3131,'poligonos',14,EST.map(e=>e[0]).concat(['verde','verde']),[2]);if(!GNIV)GNIV=generar(5151,'poligonos',14,['verde'],[1,2,3,4]);if(!GTV)GTV=TV.map(v=>({G:generar(2741,'poligonos',11,ESTADOS,null,{troje:v[0],piso:4}),t:v[1],s:v[2]}));if(!GTP)GTP=[1,2,3,4,5].map(n=>({G:generar(2741,'poligonos',11,ESTADOS,null,{troje:'casa',piso:n}),t:'Piso '+n,s:['casa y ch\'iil','+ cocina','+ pozo','+ naranjo y gallinero','+ veleta'][n-1]}));}
function recortes(Gx,idxs,el,labels,hr){
  const off=document.createElement('canvas');off.width=W;off.height=H;pintar(off,Gx,sombrear(Gx,hr),12,hr);
  const src=off.getContext('2d').getImageData(0,0,W,H).data;
  el.innerHTML=idxs.map((_,i)=>`<figure><canvas id="${el.id}${i}"></canvas><figcaption>${labels[i][0]}<span>${labels[i][1]}</span></figcaption></figure>`).join('');
  idxs.forEach((si,i)=>{let x0=W,y0=H,x1=0,y1=0;for(let p=0;p<W*H;p++)if(Gx.own[p]===si){const x=p%W,y=(p/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(W-1,x1+3);y1=Math.min(H-1,y1+3);const w=x1-x0+1,h=y1-y0+1;
    const cv=document.getElementById(el.id+i);cv.width=w*3;cv.height=h*3;const c=cv.getContext('2d');const im=c.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y+y0)*W+(x+x0),q=(y*w+x)*4,k=Gx.own[p]===si?1:.38;im.data[q]=src[p*4]*k;im.data[q+1]=src[p*4+1]*k;im.data[q+2]=src[p*4+2]*k;im.data[q+3]=255;}
    const o=document.createElement('canvas');o.width=w;o.height=h;o.getContext('2d').putImageData(im,0,0);c.imageSmoothingEnabled=false;c.drawImage(o,0,0,w*3,h*3);});
}
const TV=[['casa','Casa maya','con su ch\'iil y su solar'],['adobe','Adobe y teja','la casa del centro'],['lamina','Lámina y veleta','mediados del siglo XX'],['chiil','El ch\'iil solo','la troje sin casa'],['cuexcomate','Cuexcomate','la troje de antes']];
function fichasTroje(el,items,hr){
  el.innerHTML=items.map((it,i)=>`<figure><canvas id="${el.id}${i}"></canvas><figcaption>${it.t}<span>${it.s}</span></figcaption></figure>`).join('');
  items.forEach((it,i)=>{const Gx=it.G;const off=document.createElement('canvas');off.width=W;off.height=H;pintar(off,Gx,sombrear(Gx,hr),12,hr);
    const src=off.getContext('2d').getImageData(0,0,W,H).data;let x0=W,y0=H,x1=0,y1=0;for(let p=0;p<W*H;p++)if(Gx.own[p]===TROJE){const x=p%W,y=(p/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(W-1,x1+2);y1=Math.min(H-1,y1+2);const w=x1-x0+1,h=y1-y0+1;
    const cv=document.getElementById(el.id+i);cv.width=w*3;cv.height=h*3;const im=new ImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y+y0)*W+(x+x0),q=(y*w+x)*4,k=Gx.own[p]===TROJE?1:.45;im.data[q]=src[p*4]*k;im.data[q+1]=src[p*4+1]*k;im.data[q+2]=src[p*4+2]*k;im.data[q+3]=255;}
    const o=document.createElement('canvas');o.width=w;o.height=h;o.getContext('2d').putImageData(im,0,0);const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(o,0,0,w*3,h*3);});
}
function cuadro(el,items,hr){el.innerHTML=items.map((it,i)=>`<figure><canvas id="${el.id}${i}" width="${W*2}" height="${H*2}"></canvas><figcaption>${it.t}<span>${it.s}</span></figcaption></figure>`).join('');
  items.forEach((it,i)=>{const S2=sombrear(it.G,hr,it.est);Object.assign(S2,it.extra||{});pintar(document.getElementById(el.id+i),it.G,S2,it.tt||20,hr);});}
function pintarEstLluvia(hr){const Gb=Object.assign(generar(seed),{});
  cuadro(document.getElementById('estTiles'),[1,2,3,4].map(e=>({G:Gb,est:e,t:ESTS[e].n,s:ESTS[e].s})),hr);
  const shR=sombraRel(Gb,2.3);
  cuadro(document.getElementById('relTiles'),[{G:Gb,t:'Luz fría',s:'elegida: sube la luz y deja sombras duras',extra:{lluvia:1,hum:.6,flash:1,flashModo:'luz',flashSh:shR},tt:33},{G:Gb,t:'Inversión',s:'los colores al revés, un instante',extra:{lluvia:1,hum:.6,flash:1,flashModo:'inversion',flashSh:shR},tt:33},{G:Gb,t:'Siluetas',s:'dos tonos: luz y sombra',extra:{lluvia:1,hum:.6,flash:1,flashModo:'siluetas',flashSh:shR},tt:33}],hr);
  cuadro(document.getElementById('espTiles'),[{G:Gb,t:'Sin lluvia',s:'como siempre',extra:{}},{G:Gb,t:'La luz se nubla',s:'sombras suaves y un velo gris',extra:{espera:1,esperaModo:'luz'}},{G:Gb,t:'Chispea',s:'unas gotas sueltas',extra:{espera:1,esperaModo:'gotas'},tt:41},{G:Gb,t:'Se resguardan',s:'borregos al corral, sin pájaros',extra:{espera:1,esperaModo:'animales'}},{G:Gb,t:'Las tres juntas',s:'recomendada',extra:{espera:1,esperaModo:'luz gotas animales'},tt:41}],hr);
  cuadro(document.getElementById('lluTiles'),[{G:Gb,t:'Seca',s:'antes de la lluvia',extra:{}},{G:Gb,t:'Llueve',s:'gotas chiquitas en el suelo',extra:{lluvia:1,hum:.6},tt:33},{G:Gb,t:'Mojada',s:'la tierra se va secando',extra:{hum:.8}}],hr);}
function pintarEstados(hr){muestras();fichasTroje(document.getElementById('trojeVer'),GTV,hr);fichasTroje(document.getElementById('trojePisos'),GTP,hr);recortes(GEST,ORDEN.slice(0,12),document.getElementById('estados'),EST.map(e=>[e[1],e[2]]),hr);
  recortes(GNIV,ORDEN.slice(0,4),document.getElementById('niveles'),[1,2,3,4].map(n=>['Nivel '+n,n+(n>1?' surcos':' surco')]),hr);}
/* ================= la lluvia: la nube que espera, la lluvia que cae ================= */
let LLUVIA=null, ESPERA=false;
const hh=(a,b)=>{let h=Math.imul(a|0,0x27d4eb2d)^Math.imul(b|0,0x165667b1);h^=h>>>15;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return (h>>>0)/4294967296;};
function nubes(d,G,S,t){   /* sin nubes (Luis, 18 nov): la lluvia son impactos chiquitos en el suelo, al azar */
  const chispea=S.espera>0&&(S.esperaModo||'').includes('gotas');
  if(!(S.lluvia>0)&&!chispea)return;
  const P=S.P, I=S.lluvia>0?S.lluvia:.09*S.espera;
  const set=(x,y,c,a)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*4;const m=mix([d[i],d[i+1],d[i+2]],c,a);d[i]=m[0];d[i+1]=m[1];d[i+2]=m[2];};
  const agua=mix([214,228,240],P.sombra,S.night*.35);
  const N=Math.round(80*I);
  for(let i=0;i<N;i++){
    const per=.42*(.7+.6*hh(i,1)), tt=t+hh(i,2)*per*7, k=Math.floor(tt/per), f=tt/per-k;   /* cada gota con su ritmo */
    if(hh(i*31+7,k)<.3)continue;                                                          /* a veces no cae: huecos */
    const x=Math.floor(hh(i*7+3,k*13+5)*W), y=Math.floor(hh(i*11+9,k*17+2)*H);           /* lugar al azar en cada ciclo */
    if(f<.25){set(x,y,agua,.45);set(x+1,y,agua,.3);}
    else if(f<.55){[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>set(x+dx,y+dy,agua,.32));}
    else if(f<.8){set(x-2,y,agua,.2);set(x+2,y,agua,.2);}
  }
  /* unas pocas gotas de un píxel, cada una con su velocidad y su lugar */
  if(!(S.lluvia>0))return;
  for(let i=0;i<Math.round(40*I);i++){const sp=50+40*hh(i,9), ph=hh(i,11)*(H+10), u=ph+t*sp, k=Math.floor(u/(H+10)), fy=(u%(H+10))-5;
    const x=hh(i*3+1,k*7+4)*W; set(x-fy*.06,fy,agua,.2);}
}
function estadoLluvia(t){if(!LLUVIA)return{I:0,h:0};const e=t-LLUVIA.t0;const I=e<0?0:e<2?e/2:e<12?1:e<15?(15-e)/3:0;const h=e<15?Math.min(1,e/6):Math.max(0,1-(e-15)/40);if(e>56)LLUVIA=null;return{I,h};}
/* ================= el relámpago: no se ve el rayo, solo la luz que deja ================= */
let FLASH=null, FLASH_MODO='luz', FLASH_SUAVE=false, BUENA=true;
function sombraRel(G,a){const lx=Math.cos(a),ly=Math.sin(a),sh=new Uint8Array(W*H);const g=(x,y)=>G.h[Math.min(H-1,Math.max(0,y))*W+Math.min(W-1,Math.max(0,x))];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x;for(let k=1;k<24;k++){if(g(Math.round(x+lx*k),Math.round(y+ly*k))>G.h[p]+k*.18){sh[p]=1;break;}}}return sh;}
function iniciarRelampago(G,modo){FLASH={t0:performance.now()/1000,modo:modo||FLASH_MODO,sh:sombraRel(G,Math.random()*Math.PI*2)};}
/* doble destello: sube de golpe, baja un instante, vuelve a subir menos y se apaga más despacio (~0.6 s) */
function envolvente(e){if(e<0)return 0;if(e<.05)return e/.05;if(e<.12)return 1-(e-.05)/.07*.7;if(e<.18)return .3+.5*(e-.12)/.06;if(e<.6)return .8*(1-(e-.18)/.42);return 0;}
function relampago(d,S){const f=S.flash*(FLASH_SUAVE?.35:1), modo=(FLASH_SUAVE&&S.flashModo==='inversion')?'luz':S.flashModo, sh=S.flashSh;
  for(let p=0;p<W*H;p++){const i=p*4;let c=[d[i],d[i+1],d[i+2]];const som=sh&&sh[p];
    if(modo==='luz')c=som?mix(c,[20,26,52],.45*f):mix(c,[236,242,255],.55*f);
    else if(modo==='inversion')c=mix(c,[255-c[0],255-c[1],255-c[2]],.75*f);
    else{const L=(c[0]+c[1]+c[2])/3;c=mix(c,(!som&&L>70)?[226,234,250]:[22,28,60],.7*f);}
    d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];}}
/* ================= desenfoque ligero en las orillas (efecto diorama) ================= */
let MASCARA=null;
function orillas(d){
  if(!MASCARA){MASCARA=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const vx=(x/(W-1)-.5)/.5,vy=(y/(H-1)-.5)/.5,r=Math.sqrt(vx*vx*.9+vy*vy);const t=Math.max(0,Math.min(1,(r-.78)/.32));MASCARA[y*W+x]=.75*t*t*(3-2*t);}}
  const src=new Float32Array(W*H*3);for(let i=0;i<W*H;i++){src[i*3]=d[i*4];src[i*3+1]=d[i*4+1];src[i*3+2]=d[i*4+2];}
  const tmp=new Float32Array(W*H*3), R=1;
  for(let pase=0;pase<2;pase++){const A=pase?tmp:src, B=pase?src:tmp;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){let r=0,g=0,b=0,n=0;for(let k=-R;k<=R;k++){const xx=pase?x:Math.min(W-1,Math.max(0,x+k)),yy=pase?Math.min(H-1,Math.max(0,y+k)):y;const j=(yy*W+xx)*3;r+=A[j];g+=A[j+1];b+=A[j+2];n++;}const o=(y*W+x)*3;B[o]=r/n;B[o+1]=g/n;B[o+2]=b/n;}}
  for(let i=0;i<W*H;i++){const m=MASCARA[i];if(m<=0)continue;d[i*4]+=(src[i*3]-d[i*4])*m;d[i*4+1]+=(src[i*3+1]-d[i*4+1])*m;d[i*4+2]+=(src[i*3+2]-d[i*4+2])*m;}
}
