// La Milpa · el motor del ciclo (sesión de mecánicas, 18 nov 2026)
// Funciones puras sobre un estado JSON serializable: sin DOM, sin azar a la vista. Corre en el navegador
// (window.MilpaMotor) y en Node (require). Todo el balance viene de datos.json. Las reglas están en
// docs/milpa-flujo.md ("Estado actual"); la primera vez, en §3, la navegación y §18.
//
//   const est = crear(datos, { jugador, ahora, reloj: 'rapido' })
//   avanzar(datos, est, ahora)                 // el tiempo pasa: lluvias, crecimiento, deterioro, construcción
//   cosechar / quemar / sembrar / llover(...)   // lo que hace el jugador en una visita
//   pendientes(datos, est), hoy(datos, est), aprendizaje(datos, est), secciones(datos, est)
(function (raiz) {
  'use strict';
  const MM = (typeof module !== 'undefined' && module.exports) ? require('../../docs/milpa-maiz.js') : raiz.MilpaMaiz;

  const COLORES = ['rojo', 'guinda', 'negro', 'morado', 'azul', 'verde', 'naranja', 'amarillo', 'blanco'];
  const H_MS = 3600 * 1000;

  // ── lotes y mazorcas compactos (para guardar en el teléfono) ────────────────────────────────────
  const loteAComp = lote => lote.map(p => p.C.join('') + p.A.join('') + p.E.join(''));
  const loteDeComp = comp => comp.map(s => ({ C: [s[0], s[1]], A: [s[2], s[3]], E: [s[4], s[5]] }));
  function mazorcaAComp(m) {
    return {
      tipo: MM.tipoDe(m), tam: m.tam, est: m.estacion, casc: m.cascara, largo: m.largo, cols: m.cols,
      g: m.granos.map(g => [g.r, g.c, COLORES.indexOf(g.color), g.rayado ? 1 : 0, g.gen.C.join('') + g.gen.A.join('') + g.gen.E.join('')]),
    };
  }
  function mazorcaDeComp(c) {
    return {
      tam: c.tam, estacion: c.est, cascara: c.casc, largo: c.largo, cols: c.cols,
      granos: c.g.map(([r, col, ci, ray, s]) => ({ r, c: col, color: COLORES[ci], rayado: !!ray, gen: { C: [s[0], s[1]], A: [s[2], s[3]], E: [s[4], s[5]] } })),
    };
  }
  const semillaDeComp = c => loteAComp(MM.semillaDe(mazorcaDeComp(c)));

  // ── reloj ────────────────────────────────────────────────────────────────────────────────────────
  function escalaDe(datos, reloj) { return reloj === 'real' ? datos.reloj.real_horas_por_hora_real : datos.reloj.rapido_horas_por_hora_real; }
  function horaDeJuego(est, ahora) { return est.reloj.horaBase + (ahora - est.reloj.inicioReal) / H_MS * est.reloj.escala; }
  function horaLocal(ahora) { const d = new Date(ahora); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }

  // Cambiar de reloj sin saltos: la hora de juego sigue donde iba (con reloj real se alinea con la hora del día).
  function cambiarReloj(datos, est, reloj, ahora) {
    avanzar(datos, est, ahora);
    const h = est.hora;
    let base = h;
    if (reloj === 'real') { const dia = Math.floor(h / 24); base = dia * 24 + horaLocal(ahora); if (base < h) base += 24; }
    est.reloj = { tipo: reloj, escala: escalaDe(datos, reloj), inicioReal: ahora, horaBase: base };
    return est;
  }

  function estacion(datos, est, ahora) {
    const n = datos.reloj.estaciones, d = datos.reloj.dias_por_estacion;
    if (est.reloj.tipo === 'real') {
      const dias = Math.floor((ahora - Date.parse(datos.reloj.epoca_estaciones)) / (24 * H_MS));
      return ((Math.floor(dias / d) % n) + n) % n + 1;
    }
    return Math.floor(est.hora / 24 / d) % n + 1;
  }

  // ── crear ────────────────────────────────────────────────────────────────────────────────────────
  function nuevaParcela(datos, pos, jugador, abierta) {
    const rumbo = datos.mapa.seguras[pos] || null;
    return {
      pos, segura: !!rumbo, rumbo, nivel: 1, medidor: 0, estado: abierta ? 'vacia' : 'porAbrir', t: 0,
      lluvias: 0, crecido: 0, ceniza: 0, buenaDesde: false,
      lote: loteAComp(MM.loteRumbo(rumbo || 'amarillo', jugador)), semillaElegida: null, ultima: null, primera: false,
    };
  }

  function crear(datos, { jugador, ahora, reloj = 'rapido' }) {
    const escala = escalaDe(datos, reloj);
    const horaBase = reloj === 'real' ? horaLocal(ahora) : datos.reloj.inicio_hora_rapido;
    const est = {
      version: 1, jugador,
      reloj: { tipo: reloj, escala, inicioReal: ahora, horaBase },
      hora: horaBase, espera: datos.aprendizaje.lluvia_inicial,
      parcelas: {}, construyendo: null,
      troje: { mazorcas: 0, piso: 1, version: null },
      muestrario: {}, estante: [], semillas: [],
      contadores: { cosechas: 0, quemas: 0, siembras: 0, lluvias: 0, podridas: 0, perdidas: 0, construidas: 1 },
      visto: { monte: false },
      eventos: [],
    };
    const p1 = datos.mapa.orden[0];
    est.parcelas[p1] = nuevaParcela(datos, p1, jugador, true);
    if (datos.aprendizaje.parcela_inicial_con_ceniza) est.parcelas[p1].ceniza = datos.ceniza.cosechas;
    est.parcelas[p1].primera = true;
    return est;
  }

  const evento = (est, tipo, extra = {}) => { est.eventos.push({ tipo, hora: est.hora, ...extra }); if (est.eventos.length > 60) est.eventos.shift(); };

  // ── el tiempo pasa ──────────────────────────────────────────────────────────────────────────────
  function pudrir(datos, est, p) {
    p.estado = 'podrida'; p.t = 0; p.nivel = Math.max(1, p.nivel - 1); p.medidor = 0; p.ceniza = 0; p.lluvias = 0; p.crecido = 0;
    est.contadores.podridas++; evento(est, 'podrida', { pos: p.pos });
  }

  function paso(datos, est, dt) {
    const C = datos.cultivo;
    for (const p of Object.values(est.parcelas)) {
      p.t += dt;
      const horasCultivo = p.primera ? datos.aprendizaje.primer_cultivo_horas : C.horas;
      if (p.estado === 'creciendo') { if (p.lluvias > 0) { p.crecido += dt; if (p.crecido >= horasCultivo) { p.estado = 'lista'; p.t = 0; evento(est, 'lista', { pos: p.pos }); } } }
      else if (p.estado === 'lista' && p.t >= C.marchita) { p.estado = 'marchita'; p.t = 0; evento(est, 'marchita', { pos: p.pos }); }
      else if (p.estado === 'marchita' && p.t >= C.podrida_tras_marchita) pudrir(datos, est, p);
      else if (p.estado === 'vacia' && p.t >= C.vacia_a_podrida) pudrir(datos, est, p);
      else if (p.estado === 'podrida' && !p.segura && p.t >= C.perdida_tras_podrida) {
        delete est.parcelas[p.pos]; est.contadores.perdidas++; evento(est, 'perdida', { pos: p.pos });
      }
    }
    // construir
    const M = datos.mapa, lista = Object.values(est.parcelas);
    if (est.construyendo) {
      est.construyendo.falta -= dt;
      if (est.construyendo.falta <= 0) {
        const pos = est.construyendo.pos;
        est.parcelas[pos] = nuevaParcela(datos, pos, est.jugador, false);
        const vecino = vecinosDe(pos).map(v => est.parcelas[v]).find(v => v && v.ultima);
        if (vecino && !est.parcelas[pos].segura) est.parcelas[pos].lote = semillaDeComp(vecino.ultima);
        lista.forEach(p => (p.buenaDesde = false));
        est.construyendo = null; est.contadores.construidas++; evento(est, 'construida', { pos });
      }
    } else if (lista.length < M.orden.length && lista.every(p => !['marchita', 'podrida', 'porAbrir'].includes(p.estado) && p.buenaDesde)) {
      const pos = M.orden.find(k => !est.parcelas[k]);
      est.construyendo = { pos, falta: lista.length * M.construccion_horas_por_parcela, total: lista.length * M.construccion_horas_por_parcela };
      evento(est, 'construyendo', { pos });
    }
  }

  function avanzar(datos, est, ahora) {
    const objetivo = Math.min(horaDeJuego(est, ahora), est.hora + datos.reloj.ausencia_max_dias * 24);
    const dt = datos.reloj.paso_minutos / 60;
    while (est.hora < objetivo - 1e-9) {
      const h0 = est.hora, h1 = Math.min(objetivo, h0 + dt);
      for (let k = Math.floor(h0) + 1; k <= h1 + 1e-9; k++) if (datos.lluvia.horas.includes(((k % 24) + 24) % 24)) est.espera = Math.min(datos.lluvia.espera_max, est.espera + 1);
      lluviaSola(datos, est);
      paso(datos, est, h1 - h0);
      est.hora = h1;
    }
    if (horaDeJuego(est, ahora) > est.hora + 1e-6) { est.reloj.horaBase = est.hora; est.reloj.inicioReal = ahora; } // se recortó una ausencia larga
    return est;
  }

  // ── vecinos ─────────────────────────────────────────────────────────────────────────────────────
  function vecinosDe(pos) { const [c, r] = pos.split(',').map(Number); return [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].map(([a, b]) => `${a},${b}`); }
  const surcosDe = p => p.nivel;

  // ── lo que hace el jugador ──────────────────────────────────────────────────────────────────────
  const error = msg => ({ ok: false, error: msg });

  function cosechar(datos, est, pos, ahora) {
    const p = est.parcelas[pos];
    if (!p || p.estado !== 'lista') return error('no hay cosecha lista');
    const C = datos.cultivo;
    let g = p.lluvias - 1 + (p.ceniza > 0 ? 1 : 0);
    const usoCeniza = p.ceniza > 0; if (usoCeniza) p.ceniza--;
    const atraso = p.t < C.lista_sin_perder ? 0 : Math.min(2, 1 + Math.floor((p.t - C.lista_sin_perder) / C.pierde_grado_cada));
    g = Math.max(0, Math.min(2, g) - atraso);
    // la mazorca: su lote, el polen de los vecinos, sus lluvias y la estación
    const vecinos = vecinosDe(pos).map(v => est.parcelas[v]).filter(Boolean).map(v => ({ lote: loteDeComp(v.lote), surcos: surcosDe(v) }));
    const m = MM.cosecha({ lote: loteDeComp(p.lote), vecinos, lluvias: Math.min(3, p.lluvias), ceniza: usoCeniza, estacion: estacion(datos, est, ahora), sal: `${est.jugador}|${pos}|${Math.floor(est.hora * 12)}` });
    const comp = mazorcaAComp(m);
    const ganadas = surcosDe(p) + datos.calidad.bono_mazorcas[g];
    est.troje.mazorcas += ganadas;
    const pisoAntes = est.troje.piso;
    est.troje.piso = 1 + datos.troje.pisos.filter(x => est.troje.mazorcas >= x).length;
    p.medidor += datos.calidad.medidor[g];
    if (g >= 1) p.buenaDesde = true;
    let subio = false;
    while (p.nivel < datos.nivel.max && p.medidor >= datos.nivel.medidor[p.nivel - 1]) { p.medidor -= datos.nivel.medidor[p.nivel - 1]; p.nivel++; subio = true; }
    const nuevoTipo = !est.muestrario[comp.tipo];
    if (nuevoTipo) est.muestrario[comp.tipo] = { ...comp, hora: est.hora, pos };
    est.estante.push(comp); if (est.estante.length > datos.troje.estante) est.estante.shift();
    p.ultima = comp; p.estado = 'vacia'; p.t = 0; p.lluvias = 0; p.crecido = 0; p.primera = false;
    est.contadores.cosechas++;
    evento(est, 'cosecha', { pos, calidad: g });
    if (est.troje.piso > pisoAntes) evento(est, 'piso', { piso: est.troje.piso });
    return { ok: true, calidad: datos.calidad.nombres[g], mazorcas: ganadas, mazorca: comp, nuevoTipo, subioNivel: subio, piso: est.troje.piso, subioPiso: est.troje.piso > pisoAntes };
  }

  // Una sola acción para las tres quemas: lo podrido, lo vacío antes de sembrar y la parcela nueva.
  // exito = si el jugador terminó "Lluvias al revés". Si falla, la parcela queda limpia o abierta, sin ceniza.
  function quemar(datos, est, pos, exito = true) {
    const p = est.parcelas[pos];
    if (!p) return error('no hay parcela');
    const puede = p.estado === 'podrida' || p.estado === 'porAbrir' || (p.estado === 'vacia' && p.ceniza === 0);
    if (!puede) return error(p.ceniza > 0 ? 'todavía tiene ceniza' : 'no se puede quemar ahora');
    const era = p.estado;
    p.estado = 'vacia'; p.t = 0;
    if (exito) p.ceniza = datos.ceniza.cosechas;
    est.contadores.quemas++; evento(est, 'quema', { pos, era });
    return { ok: true, ceniza: p.ceniza, era };
  }

  // Semillas (Luis, 19 nov): la PRIMERA siembra no se elige (su parcela siembra el maíz de su rumbo). Desde la segunda,
  // siempre eliges: las 4 iniciales (rojo, blanco, negro, amarillo), la última mazorca de esa parcela ('ultima') o una
  // semilla guardada (índice). Las parcelas de los rumbos ya no siembran fijo su maíz.
  function sembrar(datos, est, pos, semilla) {
    const p = est.parcelas[pos];
    if (!p || p.estado !== 'vacia') return error('no está lista para sembrar');
    const s = semilla !== undefined && semilla !== null ? semilla : p.semillaElegida;
    const esRumbo = x => typeof x === 'string' && Object.values(datos.mapa.seguras).includes(x);
    if (est.contadores.siembras === 0) p.lote = loteAComp(MM.loteRumbo(p.rumbo || 'amarillo', est.jugador));
    else if (esRumbo(s)) p.lote = loteAComp(MM.loteRumbo(s, est.jugador)); // una de las 4 iniciales
    else if (s === 'ultima' && p.ultima) p.lote = semillaDeComp(p.ultima); // resiembra de su última mazorca
    else if (typeof s === 'number' && est.semillas[s]) p.lote = est.semillas[s].lote;
    else if (p.ultima) p.lote = semillaDeComp(p.ultima);
    else if (p.rumbo) p.lote = loteAComp(MM.loteRumbo(p.rumbo, est.jugador));
    p.semillaElegida = null;
    p.estado = 'creciendo'; p.t = 0; p.lluvias = 0; p.crecido = 0;
    est.contadores.siembras++; evento(est, 'siembra', { pos });
    return { ok: true };
  }

  // La lluvia cae sola (Luis, 20 nov): la primera lluvia de cada cultivo no la provoca el jugador. Si hay una lluvia y
  // hay matas recién sembradas (sin ninguna lluvia), cae sobre todas ellas y las arranca; las demás lluvias se quedan
  // como la sed de la milpa, que el jugador riega.
  function lluviaSola(datos, est) {
    if (est.espera <= 0) return;
    const nuevas = Object.values(est.parcelas).filter(p => p.estado === 'creciendo' && p.lluvias === 0);
    if (!nuevas.length) return;
    nuevas.forEach(p => (p.lluvias = 1));
    est.espera--; evento(est, 'lluviaSola', { parcelas: nuevas.map(p => p.pos) });
  }
  // Regar (Luis, 20 nov): el juego de Regar sacia la sed que dejaron las lluvias en las matas que ya arrancaron.
  // Si sale bien, cuenta como esas lluvias (más calidad); si la mata se encharca (exito = false), el agua se pierde.
  function regar(datos, est, exito = true) {
    if (est.espera <= 0) return error('la milpa no tiene sed');
    const reciben = Object.values(est.parcelas).filter(p => p.estado === 'creciendo' && p.lluvias >= 1 && p.lluvias < datos.lluvia.max_por_cultivo);
    if (!reciben.length) return error('no hay matas con sed');
    const cayeron = est.espera;
    if (exito) reciben.forEach(p => (p.lluvias = Math.min(datos.lluvia.max_por_cultivo, p.lluvias + cayeron)));
    est.espera = 0; est.contadores.lluvias++; evento(est, 'riego', { cayeron, exito: !!exito });
    return { ok: true, cayeron, exito: !!exito, parcelas: reciben.length };
  }
  // (antes) Una partida de Lluvias deja caer todas las que esperan sobre lo que está creciendo. Se queda para las pruebas viejas.
  function llover(datos, est) {
    if (est.espera <= 0) return error('no hay lluvia esperando');
    const reciben = Object.values(est.parcelas).filter(p => p.estado === 'creciendo' && p.lluvias < datos.lluvia.max_por_cultivo);
    if (!reciben.length) return error('no hay nada creciendo');
    const cayeron = est.espera;
    reciben.forEach(p => (p.lluvias = Math.min(datos.lluvia.max_por_cultivo, p.lluvias + cayeron)));
    est.espera = 0; est.contadores.lluvias++; evento(est, 'lluvia', { cayeron });
    return { ok: true, cayeron, parcelas: reciben.length };
  }

  // ── semillas y troje ────────────────────────────────────────────────────────────────────────────
  function guardarSemilla(datos, est, mazorcaComp, nombre) {
    if (est.semillas.length >= datos.troje.semillas_guardadas) return error('ya tienes todas las semillas que caben');
    est.semillas.push({ nombre: nombre || `semilla ${est.semillas.length + 1}`, lote: semillaDeComp(mazorcaComp), muestra: mazorcaComp.tipo });
    return { ok: true, indice: est.semillas.length - 1 };
  }
  function quitarSemilla(datos, est, i) { est.semillas.splice(i, 1); Object.values(est.parcelas).forEach(p => { if (typeof p.semillaElegida !== 'number') return; if (p.semillaElegida === i) p.semillaElegida = null; else if (p.semillaElegida > i) p.semillaElegida--; }); return { ok: true }; }
  // Arrastrar una semilla sobre parcelas: queda marcada para su siguiente siembra (al sembrar sale ya escogida).
  // i = índice de una semilla guardada, o el nombre de un rumbo ('rojo', 'blanco', 'negro', 'amarillo').
  function elegirSemilla(datos, est, i, posiciones) {
    const esRumbo = typeof i === 'string' && Object.values(datos.mapa.seguras).includes(i);
    if (!esRumbo && !est.semillas[i]) return error('no hay esa semilla');
    const marcadas = posiciones.filter(pos => est.parcelas[pos]);
    marcadas.forEach(pos => (est.parcelas[pos].semillaElegida = i));
    return { ok: true, marcadas };
  }
  function elegirTroje(datos, est, i) { if (!datos.troje.versiones[i]) return error('no hay esa troje'); est.troje.version = i; return { ok: true }; }
  function marcarVisto(est, que) { est.visto[que] = true; return { ok: true }; }

  // ── consultas para las pantallas ────────────────────────────────────────────────────────────────
  // Lo que pide cada parcela (para marcarla en el monte) y la lluvia que espera.
  function pendientes(datos, est) {
    const lista = [];
    for (const p of Object.values(est.parcelas)) {
      if (p.estado === 'lista') lista.push({ pos: p.pos, que: 'cosechar' });
      else if (p.estado === 'podrida' || p.estado === 'porAbrir') lista.push({ pos: p.pos, que: 'quemar' });
      else if (p.estado === 'vacia') lista.push({ pos: p.pos, que: 'sembrar' });
    }
    const hayCreciendo = Object.values(est.parcelas).some(p => p.estado === 'creciendo' && p.lluvias >= 1 && p.lluvias < datos.lluvia.max_por_cultivo);   // con sed: ya arrancó con la lluvia
    return { parcelas: lista, lluvia: est.espera > 0 && hayCreciendo ? est.espera : 0, faltan: lista.length + (est.espera > 0 && hayCreciendo ? 1 : 0) };
  }

  // Cuántos juegos tiene la serie de una siembra o una cosecha en esa parcela (Luis, 19 nov):
  // base + (nivel − 1) + (piso − 1), hasta el tope. Sin parcela (la práctica), la base.
  function juegosPorVisita(datos, est, pos) {
    const S = datos.serie, p = pos != null ? est.parcelas[pos] : null;
    if (!p) return S.base;
    return Math.min(S.tope, S.base + S.por_nivel * (p.nivel - 1) + S.por_piso * (est.troje.piso - 1));
  }

  // La sección "hoy" de la troje.
  function hoy(datos, est, ahora) {
    const pend = pendientes(datos, est);
    return {
      dia: Math.floor(est.hora / 24) + 1, hora: est.hora % 24, estacion: estacion(datos, est, ahora),
      parcelas: Object.keys(est.parcelas).length, pendientes: pend, lluviasEsperando: est.espera,
      construyendo: est.construyendo ? { pos: est.construyendo.pos, faltanHoras: est.construyendo.falta } : null,
      troje: { ...est.troje, siguientePiso: datos.troje.pisos[est.troje.piso - 1] || null },
      tipos: Object.keys(est.muestrario).length,
    };
  }

  // Qué secciones de la troje ya aparecieron (como las apps del NookPhone que se desbloquean al avanzar).
  function secciones(datos, est) {
    const cond = {
      primera_cosecha: est.contadores.cosechas >= 1,
      segunda_parcela: Object.keys(est.parcelas).length >= 2,
      piso_2: est.troje.piso >= 2,
    };
    return Object.entries(datos.aprendizaje.secciones_troje).filter(([, c]) => cond[c]).map(([s]) => s);
  }

  // En qué paso de la primera vez va el jugador (sin menú de entrada: se aprende haciendo).
  function aprendizaje(datos, est) {
    if (est.contadores.cosechas === 0) {
      const p = est.parcelas[datos.mapa.orden[0]];
      if (p.estado === 'vacia') return 'sembrar';
      if (p.estado === 'creciendo' && p.lluvias === 0) return 'lluvia';   // la lluvia cae sola
      if (p.estado === 'creciendo') return 'esperar';
      if (p.estado === 'lista') return 'cosechar';
    }
    if (!est.visto.monte) return 'troje'; // al guardar la primera cosecha: la troje aparece y la cámara se aleja
    if (est.troje.version == null) return 'elegir_troje';
    return 'libre';
  }

  const api = {
    crear, avanzar, cambiarReloj, estacion, horaDeJuego,
    cosechar, quemar, sembrar, llover, regar,
    guardarSemilla, quitarSemilla, elegirSemilla, elegirTroje, marcarVisto,
    pendientes, hoy, secciones, aprendizaje, vecinosDe, juegosPorVisita,
    mazorcaDeComp, loteDeComp,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.MilpaMotor = api;
})(typeof window !== 'undefined' ? window : globalThis);
