// La Milpa · el maíz generativo (sesión de mecánicas, ronda 10, 18 nov 2026)
// Un modelo genético SENCILLO, sacado de cómo se colorea el grano en la vida real (docs/milpa-flujo.md §15–§16).
// Corre igual en el navegador (window.MilpaMaiz) y en Node (require). Sin azar a la vista: todo sale de un hash
// de (jugador, parcela, día, grano), así que la misma historia da siempre las mismas mazorcas.
(function (raiz) {
  'use strict';

  // ── Tres capas, tres genes, cada uno con 2 copias (una de la madre y una del polen) ─────────────
  // Cáscara (pericarpio): r roja > v rayada > t transparente. Es tejido de la MADRE: se ve igual en toda la mazorca.
  // Capa (aleurona):      m morada > z azul > s sin color. Dos m = negro (más pigmento). La cambia el polen.
  // Centro (endospermo):  o naranja > y amarillo > b blanco. La cambia el polen.
  const DOM = { C: 'rvt', A: 'mzs', E: 'oyb' };
  const COLOR = {
    rojo: '#C8372D', guinda: '#7A1F3D', negro: '#2B2E36', morado: '#6A2C80', azul: '#2E5AAC',
    verde: '#2F8C7A', naranja: '#E8742A', amarillo: '#E9B320', blanco: '#FFFFFF',
  };
  const OSCUROS = new Set(['negro', 'morado', 'azul', 'verde']);

  // hash determinista → [0, 1)
  function hash(...xs) {
    let h = 2166136261 >>> 0;
    for (const x of xs) {
      const s = String(x);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    }
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const domina = (gen, par) => (DOM[gen].indexOf(par[0]) <= DOM[gen].indexOf(par[1]) ? par[0] : par[1]);

  function cascara(C) { const d = domina('C', C); return d === 'r' ? 'roja' : d === 'v' ? 'rayada' : 'transparente'; }
  function capa(A) { const d = domina('A', A); return d === 'm' ? (A[0] === 'm' && A[1] === 'm' ? 'negro' : 'morado') : d === 'z' ? 'azul' : null; }
  function centro(E) { const d = domina('E', E); return d === 'o' ? 'naranja' : d === 'y' ? 'amarillo' : 'blanco'; }

  // Lo que se ve de un grano: la cáscara de la madre encima de la capa y el centro del grano.
  function seVe(cascMadre, A, E) {
    const c = capa(A), ce = centro(E);
    let base = c ? (c === 'azul' && ce !== 'blanco' ? 'verde' : c) : ce; // azul sobre amarillo se ve verdoso (aprox.)
    if (cascMadre === 'roja') base = OSCUROS.has(base) ? 'guinda' : 'rojo';
    return { color: base, rayado: cascMadre === 'rayada' };
  }

  // ── Las semillas de los 4 rumbos: poblaciones casi puras, con variantes escondidas que cambian por jugador ──
  // (Las razas nativas son poblaciones revueltas: cada familia guarda una semilla un poco distinta.)
  const RUMBOS = {
    rojo: { C: 'rr', A: 'ss', E: 'bb', ocultos: [['C', 'v'], ['C', 't'], ['E', 'y']] },
    blanco: { C: 'tt', A: 'ss', E: 'bb', ocultos: [] },
    negro: { C: 'tt', A: 'mm', E: 'bb', ocultos: [['A', 'z'], ['A', 's'], ['E', 'y']] },
    amarillo: { C: 'tt', A: 'ss', E: 'yy', ocultos: [['E', 'o'], ['E', 'b'], ['A', 'z']] },
  };
  // y una sorpresa por jugador y rumbo: una variante rara que solo traen algunos (las familias guardan semillas distintas)
  const SORPRESAS = [['C', 'v'], ['C', 'r'], ['A', 'z'], ['A', 'm'], ['E', 'o'], ['E', 'y']];
  const N = 24; // plantas por lote de semilla

  function loteRumbo(nombre, jugador) {
    const R = RUMBOS[nombre], lote = [];
    // cuánto trae de cada variante escondida este jugador (0 a 30 %; a veces nada)
    const ocultos = [...R.ocultos, SORPRESAS[Math.floor(hash(jugador, nombre, 'sorpresa') * SORPRESAS.length)]];
    const frec = ocultos.map((o, k) => { const u = hash(jugador, nombre, 'frec', k); return u < 0.25 ? 0 : (u - 0.25) * 0.4; });
    for (let i = 0; i < N; i++) {
      const p = { C: R.C.split(''), A: R.A.split(''), E: R.E.split('') };
      ocultos.forEach(([gen, al], k) => { if (hash(jugador, nombre, i, k) < frec[k]) p[gen][0] = al; });
      lote.push(p);
    }
    return lote;
  }

  // ── Una cosecha: una mazorca de una planta madre, polinizada por su parcela y sus vecinos ──────────
  // vecinos: [{ lote, surcos }]; cada surco del vecino da 12 % de polen ajeno (tope 50 %).
  function cosecha({ lote, vecinos = [], lluvias = 2, ceniza = false, estacion = 2, sal = '' }) {
    const tam = Math.min(3, lluvias + (ceniza ? 1 : 0));
    const largo = [0, 8, 11, 14][tam], cols = 6;
    const madre = lote[Math.floor(hash(sal, 'madre') * lote.length)];
    const casc = cascara(madre.C);
    const totalVec = vecinos.reduce((s, v) => s + v.surcos, 0);
    const ajeno = Math.min(0.5, 0.12 * totalVec);
    const granos = [];
    for (let r = 0; r < largo; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (tam === 1 && r >= largo - 3 && hash(sal, i, 'hueco') < (r - largo + 4) * 0.3) continue;
      let padreLote = lote;
      if (totalVec && hash(sal, i, 'polen') < ajeno) {
        let u = hash(sal, i, 'cual') * totalVec;
        for (const v of vecinos) { if ((u -= v.surcos) < 0) { padreLote = v.lote; break; } }
      }
      const padre = padreLote[Math.floor(hash(sal, i, 'padre') * padreLote.length)];
      const hijo = {};
      for (const g of ['C', 'A', 'E']) hijo[g] = [madre[g][hash(sal, i, g, 'm') < 0.5 ? 0 : 1], padre[g][hash(sal, i, g, 'p') < 0.5 ? 0 : 1]];
      granos.push({ r, c, gen: hijo, ...seVe(casc, hijo.A, hijo.E) });
    }
    return { granos, largo, cols, tam, estacion, cascara: casc };
  }

  // Guardar como semilla: los granos de la mazorca son las plantas del siguiente lote.
  function semillaDe(mazorca) {
    const g = mazorca.granos, lote = [];
    for (let i = 0; i < N && g.length; i++) {
      const k = g[Math.floor((i + 0.5) * g.length / N)].gen;
      lote.push({ C: [...k.C], A: [...k.A], E: [...k.E] });
    }
    return lote;
  }

  // El tipo de una mazorca (para el muestrario): los colores que pesan al menos 12 %, del que más hay al que menos
  // ("morado con amarillo" no es "amarillo con morado"), más si es rayada.
  function tipoDe(mazorca) {
    const cuenta = {};
    for (const g of mazorca.granos) cuenta[g.color] = (cuenta[g.color] || 0) + 1;
    const tot = mazorca.granos.length || 1;
    const cols = Object.keys(cuenta).filter(k => cuenta[k] / tot >= 0.12).sort((a, b) => cuenta[b] - cuenta[a] || (a < b ? -1 : 1));
    return cols.join(' con ') + (mazorca.cascara === 'rayada' ? ' rayada' : '');
  }

  // Tono de la estación (nombres de trabajo; lo visual lo decide la otra sesión).
  function tono(hex, estacion, r, c) {
    const mezcla = (to, k) => { const n = parseInt(hex.slice(1), 16), t = parseInt(to.slice(1), 16); const ch = s => Math.round(((n >> s) & 255) * (1 - k) + ((t >> s) & 255) * k); return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join(''); };
    if (estacion === 1) return mezcla('#FFFFFF', 0.35);
    if (estacion === 3) return mezcla('#000000', 0.28);
    if (estacion === 4 && (r + c) % 2) return mezcla('#FFFFFF', 0.32);
    return hex;
  }

  // Dibujo SVG de baja fidelidad de una mazorca (para la página del flujo).
  function svg(mazorca, { escala = 1, borde = '#5B5F6B', contorno = '#121317' } = {}) {
    const kw = 22 * escala, kh = 17 * escala, W = mazorca.cols * kw, H = mazorca.largo * kh, x0 = 6 * escala, y0 = 8 * escala;
    let s = `<rect x="${x0 - 6 * escala}" y="${y0 - 8 * escala}" width="${W + 12 * escala}" height="${H + 18 * escala}" rx="${W / 2}" fill="none" stroke="${contorno}" stroke-width="${2 * escala}"/>`;
    for (const g of mazorca.granos) {
      const x = x0 + g.c * kw + 2 * escala + (g.c === 0 ? 4 * escala : 0), y = y0 + g.r * kh + escala;
      const w = kw - 4 * escala - (g.c === 0 || g.c === mazorca.cols - 1 ? 4 * escala : 0), h = kh - 3 * escala;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${4 * escala}" fill="${tono(COLOR[g.color], mazorca.estacion, g.r, g.c)}" stroke="${borde}" stroke-width="${0.8 * escala}"/>`;
      if (g.rayado) s += `<line x1="${x + w * 0.3}" y1="${y + 1}" x2="${x + w * 0.3}" y2="${y + h - 1}" stroke="${COLOR.rojo}" stroke-width="${2 * escala}"/><line x1="${x + w * 0.7}" y1="${y + 1}" x2="${x + w * 0.7}" y2="${y + h - 1}" stroke="${COLOR.rojo}" stroke-width="${1.2 * escala}"/>`;
    }
    return { cuerpo: s, ancho: W + 12 * escala, alto: H + 18 * escala };
  }

  // ── Una milpa completa, día por día, para ver cómo diverge cada jugador ─────────────────────────
  // Mapa 3 × 5 con la troje en (1,2). Las 4 seguras siembran siempre su rumbo; las otras 10 resiembran
  // de su propia cosecha (lo normal) o de una semilla guardada, según la estrategia del jugador.
  const SEGURAS = { '1,1': 'blanco', '2,2': 'rojo', '1,3': 'amarillo', '0,2': 'negro' };
  const ORDEN = ['1,1', '2,2', '1,3', '0,2', '0,1', '2,1', '0,3', '2,3', '0,0', '1,0', '2,0', '0,4', '1,4', '2,4'];
  const CONSTRUIDA = [0, 2, 4, 6, 9, 11, 14, 18, 22, 26, 30, 34, 38, 43]; // día en que llega cada parcela (bots, §13)
  const vecinosDe = k => { const [c, r] = k.split(',').map(Number); return [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].map(([a, b]) => `${a},${b}`); };

  // segurasFijas: true = las 4 seguras resiembran siempre su rumbo (regla vieja, ronda 6); false = desde la segunda siembra
  // se elige semilla en todas, también en las seguras (Luis, 19 nov). Las páginas viejas usan el valor por defecto.
  function milpa({ jugador, estrategia = 'deja', dias = 84, lluvias = 2, segurasFijas = true }) {
    const fija = k => segurasFijas && SEGURAS[k];
    const P = {};                 // parcela → { lote, ultima, desde }
    const muestrario = new Map(); // tipo → { mazorca, dia, parcela }
    const estante = [], semillas = [], historia = [];
    for (let d = 0; d < dias; d++) {
      ORDEN.forEach((k, n) => {
        if (CONSTRUIDA[n] !== d || P[k]) return;
        let lote;
        if (SEGURAS[k]) lote = loteRumbo(SEGURAS[k], jugador);
        else { const v = vecinosDe(k).find(x => P[x] && P[x].ultima); lote = v ? semillaDe(P[v].ultima) : loteRumbo('amarillo', jugador); }
        P[k] = { lote, ultima: null, desde: d };
      });
      const estacion = Math.floor(d / 7) % 4 + 1;
      const cosechas = {};
      for (const k of Object.keys(P)) {
        const surcosDe = x => Math.min(4, 1 + Math.floor((d - P[x].desde) / 5));
        const vecinos = vecinosDe(k).filter(x => P[x]).map(x => ({ lote: P[x].lote, surcos: surcosDe(x) }));
        const m = cosecha({ lote: P[k].lote, vecinos, lluvias, ceniza: d % 3 === 0, estacion, sal: `${jugador}|${k}|${d}` });
        cosechas[k] = m;
        const t = tipoDe(m);
        if (!muestrario.has(t)) muestrario.set(t, { mazorca: m, dia: d, parcela: k });
        estante.push(m); if (estante.length > 20) estante.shift();
      }
      // resembrar
      const nuevas = [];
      for (const [k, m] of Object.entries(cosechas)) {
        P[k].ultima = m;
        if (fija(k)) { P[k].lote = loteRumbo(SEGURAS[k], jugador); continue; }
        if (estrategia === 'curioso' && muestrario.get(tipoDe(m)).dia === d) nuevas.push(m);
        P[k].lote = semillaDe(m);
      }
      // 'rumbos': como 'deja', pero una vez por semana vuelve a sembrar las 4 semillas iniciales en las seguras
      if (estrategia === 'rumbos' && d % 7 === 6) Object.keys(SEGURAS).forEach(k => { if (P[k]) P[k].lote = loteRumbo(SEGURAS[k], jugador); });
      if (estrategia === 'curioso') {
        for (const m of nuevas) { semillas.push(semillaDe(m)); if (semillas.length > 6) semillas.shift(); }
        // cada semana siembra sus semillas guardadas en las parcelas que no son seguras
        if (d % 7 === 6 && semillas.length) Object.keys(P).filter(k => !fija(k)).forEach((k, i) => { P[k].lote = semillas[i % semillas.length]; });
      }
      if (estrategia === 'morado') {
        // guarda la mazorca más morada de la semana y la siembra en todas las que no son seguras
        const peso = m => m.granos.filter(g => g.color === 'morado' || g.color === 'guinda' || g.color === 'negro').length / (m.granos.length || 1);
        const mejor = Object.entries(cosechas).filter(([k]) => !fija(k)).sort((a, b) => peso(b[1]) - peso(a[1]))[0];
        if (mejor && d % 7 === 6) Object.keys(P).filter(k => !fija(k)).forEach(k => { P[k].lote = semillaDe(mejor[1]); });
      }
      historia.push({ dia: d, tipos: muestrario.size, parcelas: Object.keys(P).length });
    }
    return { muestrario, estante, semillas, historia };
  }

  const api = { COLOR, RUMBOS, hash, loteRumbo, cosecha, semillaDe, tipoDe, seVe, cascara, capa, centro, svg, tono, milpa };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.MilpaMaiz = api;
})(typeof window !== 'undefined' ? window : globalThis);
