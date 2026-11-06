'use strict';
/* ================= ЯЗЫК ================= */
const SEPARATE = ['u', 'i', 'o'];
const CT = {k:'к',n:'н',g:'г',h:'х',v:'в',p:'п',r:'р',l:'л',d:'д',zh:'ж',m:'м',t:'т',ch:'ч/ц',sh:'ш/щ',z:'з/с',b:'б/ф'};
const CT1 = {ch:'ч',sh:'ш',z:'з',b:'б'}, CT2 = {ch:'ц',sh:'щ',z:'с',b:'ф'};
const VT = {u:['у'],e:['е','ё'],eh:['э'],i:['и','ы'],a:['а','о'],ya:['я'],yu:['ю'],o:['о']};
const CONS = Object.keys(CT), VOWS = ['u','e','eh','i','a','ya','yu'], SINGLE = ['u','eh','ya','yu'];
const MARKN = {soft:'знак мягкости',hard:'знак твёрдости',first:'знак первого варианта гласной',second:'знак второго варианта гласной',lane:'знак второго варианта согласной',end:'знак конца предложения'};
const LC = {к:'k',н:'n',г:'g',х:'h',в:'v',п:'p',р:'r',л:'l',д:'d',ж:'zh',м:'m',т:'t',ч:'ch',ш:'sh',з:'z',б:'b'};
const LL = {ц:'ch',щ:'sh',с:'z',ф:'b'};
const VM = {е:'first',ё:'second',а:'first',о:'second',и:'first',ы:'second'};
const LV = {у:'u',е:'e',ё:'e',э:'eh',и:'i',ы:'i',а:'a',о:'a',я:'ya',ю:'yu'};

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function pickW(a, wf) { let s = a.reduce((x, e) => x + wf(e), 0), r = Math.random() * s; for (const e of a) { r -= wf(e); if (r <= 0) return e; } return a[a.length - 1]; }

const vtext = (v, m) => { const t = VT[v]; return m && m.includes('first') ? t[0] : m && m.includes('second') ? (t[1] || t[0]) : t.join('/'); };
const ctext = c => c.lane && CT2[c.c] ? CT2[c.c] : CT[c.c];
function translit(cs) {
  return cs.map(c => {
    if (c.t === 'sp') return ' ';
    if (c.t === 'end') return '.';
    const m = c.m || [];
    if (c.t === 'v') return c.v === 'i' && m.includes('soft') ? 'й' : vtext(c.v, m) + (m.includes('soft') ? 'ь' : '') + (m.includes('hard') ? 'ъ' : '');
    return ctext(c) + (m.includes('hard') ? 'ъ' : '') + (m.includes('soft') ? 'ь' : '') + (c.v ? vtext(c.v, m) : '');
  }).join('');
}

// русское слово -> символы фикционного по правилам языка
function word2cells(w) {
  const cs = [];
  for (const ch of w) {
    const l = cs[cs.length - 1];
    if (LC[ch]) cs.push({t:'c',c:LC[ch],v:null,lane:false,m:[]});
    else if (LL[ch]) cs.push({t:'c',c:LL[ch],v:null,lane:true,m:[]});
    else if (LV[ch]) { if (l && l.t === 'c' && !l.v) { l.v = LV[ch]; l.vm = VM[ch]; } else cs.push({t:'v',v:ch === 'о' ? 'o' : LV[ch],m:[],vm:ch === 'о' ? null : VM[ch]}); }
    else if (ch === 'й') cs.push({t:'v',v:'i',m:['soft']});
    else if (ch === 'ь' && l && l.t === 'c') l.m.push('soft');
    else if (ch === 'ъ' && l && l.t === 'c') l.m.push('hard');
    else if (ch === ' ') cs.push({t:'sp'});
  }
  return cs;
}
// «подпись» слова для проверки: знаки и lane необязательны
const sig = cs => cs.filter(c => c.t !== 'end').map(c => c.t === 'sp' ? ' ' : c.t + ':' + (c.c || '') + ':' + (c.v === 'o' ? 'a' : c.v || ''));
function lev(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}
const keysOf = cs => [...new Set(cs.flatMap(c => c.t === 'c' ? ['c:' + c.c].concat(c.v ? ['v:' + c.v] : []) : c.t === 'v' ? ['v:' + (c.v === 'o' ? 'a' : c.v)] : c.t === 'icon' ? ['i:' + c.name] : []))];
const cellId = c => c.t === 'c' ? 'c' + c.c + (c.v || '') + (c.lane ? 'L' : '') : c.t === 'v' ? 'v' + c.v : c.name || c.t;
function textOf(c) { if (c.t === 'v') return VT[c.v].join('/'); if (c.t === 'c' && !c.v) return ctext(c); return translit([c]); }
function promptOf(c) {
  if (c.t === 'icon') return MARKN[c.name];
  if (c.t === 'v') return 'гласную ' + VT[c.v].join('/');
  return c.v ? 'символ ' + translit([c]) : 'букву ' + CT[c.c];
}

/* ================= ДАННЫЕ ИГРОКА ================= */
const KEY = 'fiktsionny_v1';
let S;
function load() {
  let o = null; try { o = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  S = Object.assign({xp:0,lessons:0,nick:'Фикционер' + (100 + rnd(900)),sound:true,streak:0,last:'',skill:{},hist:[],correct:0,answered:0,map:null,maps:0,recentW:[]}, o || {});
  if (!S.map) S.map = newMap();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const day = d => new Date(d).toLocaleDateString('sv');
const today = () => day(Date.now()), yest = () => day(Date.now() - 864e5);
const streakNow = () => (S.last === today() || S.last === yest()) ? S.streak : 0;
function newMap() {
  return {n:3 + rnd(4), color:'hsl(' + rnd(360) + ',65%,55%)', shapes:Array.from({length:6}, () => pick(['★','▲','●','◆','■','✚','♥','☾'])), done:0};
}
const sk = k => S.skill[k] || 0, learned = k => sk(k) >= 5;
const WL = [...new Set(WORDS.map(w => String(w).trim().toLowerCase()).filter(Boolean))].map(w => ({w, cells: word2cells(w)})).filter(x => x.cells.length);
const learnedWords = () => WL.filter(x => keysOf(x.cells).every(learned));
// слова, которых не было в этом уроке и среди последних 8 использованных
const freshWords = () => learnedWords().filter(x => !L.usedW.has(x.w) && !S.recentW.includes(x.w));
function useWords(ws) { ws.forEach(w => { L.usedW.add(w); S.recentW.push(w); }); S.recentW = S.recentW.slice(-8); }
function lessonSize() { let n = 5, need = 10, step = 15; while (S.lessons >= need && n < 12) { n++; need += step; step += 5; } return n; }

/* ================= ЗВУК ================= */
let AC;
function beep(seq) {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    let t = AC.currentTime;
    for (const [f, d, type] of seq) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); t += d * .9;
    }
  } catch (e) {}
}
const SND = {ok:[[660,.1],[880,.15]], bad:[[220,.25,'sawtooth']], end:[[523,.12],[659,.12],[784,.12],[1047,.3]]};

/* ================= ОТРИСОВКА СИМВОЛОВ ================= */
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function img(p) { const i = new Image(); i.draggable = false; i.alt = ''; i.src = 'glyphs/' + p + '.png'; i.onerror = () => { i.onerror = null; i.src = 'glyphs/' + p + '.svg'; }; return i; }
const vp = (v, alone) => 'vowels/' + v + (alone && SEPARATE.includes(v) ? '_alone' : '');
function cellEl(c) {
  const d = el('div', 'cell ' + c.t), gl = el('div', 'gl');
  if (c.t === 'c' || c.t === 'v') {
    const mk = el('div', 'marks'); (c.m || []).forEach(m => mk.append(img('marks/' + m)));
    if (c.t === 'c') {
      gl.append(img('consonants/' + c.c));
      if (c.lane) gl.append(img('marks/lane'));
      if (c.v) { const i = img(vp(c.v, false)); if (!['u','i','o','e'].includes(c.v)) i.classList.add('small'); gl.append(i); } // кроме У, ИЫ, ЕЁ гласные поверх согласной меньше
    } else gl.append(img(vp(c.v, true)));
    d.append(mk, gl);
  } else { gl.append(img(c.t === 'sp' ? 'symbols/space' : c.t === 'end' ? 'symbols/end' : c.p)); d.append(gl); }
  return d;
}
function cellsEl(cs, g) { const o = el('div', 'out'); if (g) o.style.setProperty('--g', g); cs.forEach(c => o.append(cellEl(c))); return o; }

/* ================= КЛАВИАТУРА ================= */
const ROWS = [
  [['c','ch'],['v','u'],['c','k'],['v','e'],['c','n'],['c','g'],['c','sh'],['c','z'],['c','h'],['m','hard']],
  [['c','b'],['c','v'],['v','a'],['c','p'],['c','r'],['v','o'],['c','l'],['c','d'],['l'],['c','zh'],['v','eh']],
  [['v','ya'],['c','m'],['v','i'],['c','t'],['m','soft'],['m','first'],['m','second'],['v','yu'],['back']],
  [['clear'],['space'],['end']]
];
function keyboard(T, onChange) {
  const last = () => T[T.length - 1], X = {soft:'hard',hard:'soft',first:'second',second:'first'};
  const act = {
    c: k => T.push({t:'c',c:k,v:null,lane:false,m:[]}),
    v: k => { const l = last(); if (k !== 'o' && l && l.t === 'c' && !l.v) l.v = k; else T.push({t:'v',v:k,m:[]}); },
    m: k => { const l = last(); if (!l || (l.t !== 'c' && l.t !== 'v')) return; if (l.m.includes(k)) l.m = l.m.filter(x => x !== k); else { l.m = l.m.filter(x => x !== X[k]); l.m.push(k); } },
    l: () => { const l = last(); if (l && l.t === 'c') l.lane = !l.lane; },
    back: () => { const l = last(); if (!l) return; if (l.m && l.m.length) l.m.pop(); else if (l.t === 'c' && l.v) l.v = null; else if (l.t === 'c' && l.lane) l.lane = false; else T.pop(); },
    clear: () => { T.length = 0; }, space: () => T.push({t:'sp'}), end: () => T.push({t:'end'})
  };
  const kb = el('div', 'kb');
  ROWS.forEach((spec, ri) => {
    const row = el('div', 'row r' + (ri + 1));
    for (const [type, name] of spec) {
      const b = el('button', 'key' + (type === 'space' ? ' space' : type === 'clear' || type === 'end' ? ' side' : ''));
      b.type = 'button';
      const p = {c:'consonants/' + name, v:(name === 'i' || name === 'o' ? 'vowels/' + name + '_alone' : 'vowels/' + name), m:'marks/' + name, l:'marks/lane', space:'symbols/space', end:'symbols/end'}[type];
      if (p) b.append(img(p)); else b.textContent = type === 'back' ? '⌫' : 'очистить';
      b.onclick = () => { act[type](name); onChange(); };
      row.append(b);
    }
    kb.append(row);
  });
  return kb;
}

/* ================= ЗАДАНИЯ ================= */
const TH = {match:[0,60,150,260], build:[40,160], pairs:[80,200], translate:[120], write:[180]};
const lvl = t => TH[t].filter(x => S.xp >= x).length;
const mkCell = (c, v) => ({t:'c',c,v:v || null,lane:false,m:[]});
function pool(level) {
  let p = CONS.map(c => mkCell(c));
  if (level >= 2) p = p.concat(VOWS.concat('o').map(v => ({t:'v',v,m:[]})));
  if (level >= 3) for (let i = 0; i < 14; i++) p.push(mkCell(pick(CONS), pick(VOWS)));
  if (level >= 4) p = p.concat(['soft','hard','first','second','lane'].map(n => ({t:'icon',p:'marks/' + n,name:n})), [{t:'icon',p:'symbols/end',name:'end'}]);
  return p;
}
const cellW = c => (c.t === 'icon' ? 4 : 1) / (1 + Math.min(...keysOf([c]).map(sk)));

const MK = {
  match() {
    const p = pool(lvl('match')), fr = p.filter(c => !L.usedC.has(cellId(c))), target = pickW(fr.length ? fr : p, cellW), opts = [target], ids = new Set([cellId(target)]);
    L.usedC.add(cellId(target));
    for (const c of shuffle(p)) { if (opts.length >= 4) break; if (!ids.has(cellId(c))) { ids.add(cellId(c)); opts.push(c); } }
    return {type:'match', target, opts:shuffle(opts), keys:keysOf([target])};
  },
  build() {
    const lv = lvl('build'), c = pick(lv < 2 ? CONS.filter(x => !CT2[x]) : CONS);
    const kv = VOWS.filter(x => sk('v:' + x) >= 2), sv = kv.filter(x => SINGLE.includes(x)); // только гласные, уже встречавшиеся в «Сопоставить»
    const v = lv < 2 ? (sv.length && Math.random() < .6 ? pick(sv) : null) : (kv.length && Math.random() < .75 ? pick(kv) : null);
    const g = {c, v, lane: lv >= 2 && !!CT2[c] && Math.random() < .5, m1: lv >= 2 && Math.random() < .25 ? pick(['soft','hard']) : null, m2: v && VT[v].length > 1 ? pick(['first','second']) : null};
    const text = (g.lane ? CT2[c] : CT1[c] || CT[c]) + (g.m1 === 'hard' ? 'ъ' : g.m1 === 'soft' ? 'ь' : '') + (v ? vtext(v, [g.m2]) : '');
    const parts = [{g:'c',k:c}];
    shuffle(CONS.filter(x => x !== c)).slice(0, 2).forEach(k => parts.push({g:'c',k}));
    if (v) parts.push({g:'v',k:v});
    shuffle(VOWS.filter(x => x !== v)).slice(0, v ? 1 : 2).forEach(k => parts.push({g:'v',k}));
    if (lv >= 2) {
      parts.push({g:'lane',k:'lane'});
      parts.push({g:'m1',k:g.m1 || pick(['soft','hard'])});
      parts.push({g:'m2',k:g.m2 || pick(['first','second'])});
    }
    const seen = new Set();
    return {type:'build', g, text, parts:shuffle(parts.filter(p => !seen.has(p.g + p.k) && seen.add(p.g + p.k))), keys:keysOf([mkCell(c, v)])};
  },
  pairs(lw) {
    let items;
    if (lvl('pairs') >= 2 && lw.length >= 3 && Math.random() < .6) { const ws = shuffle(lw).slice(0, 3); useWords(ws.map(x => x.w)); items = ws.map(x => ({cells:x.cells, text:x.w, word:true})); }
    else {
      const ids = new Set(), txt = new Set(); items = [];
      for (const c of shuffle(pool(Math.min(3, lvl('match'))))) {
        if (items.length >= 4) break;
        const tx = textOf(c); if (ids.has(cellId(c)) || txt.has(tx)) continue;
        ids.add(cellId(c)); txt.add(tx); items.push({cells:[c], text:tx});
      }
    }
    return {type:'pairs', items, once:true, keys:keysOf(items.flatMap(i => i.cells))};
  },
  translate(lw) { const x = pick(lw); useWords([x.w]); return {type:'translate', w:x.w, cells:x.cells, tries:0, keys:keysOf(x.cells)}; },
  write(lw) { const x = pick(lw); useWords([x.w]); return {type:'write', w:x.w, cells:x.cells, tries:0, keys:keysOf(x.cells)}; }
};
let lastType = '';
function makeTask() {
  const lw = freshWords(), av = [];
  const add = (t, w) => { if (lvl(t) > 0) av.push([t, w]); };
  add('match', 4); add('build', 2); add('pairs', 2);
  if (lw.length) { add('translate', 2); add('write', 2); }
  let t = pickW(av, x => x[1])[0];
  if (t === lastType && av.length > 1) t = pickW(av, x => x[1])[0];
  lastType = t;
  let task;
  for (let i = 0; i < 6; i++) { task = MK[t](lw); if (task.type !== 'build' || !L.usedB.has(task.text)) break; }
  if (task.type === 'build') L.usedB.add(task.text);
  return task;
}

/* ================= УРОК ================= */
let L;
const $app = () => document.getElementById('app');
function startLesson() {
  document.getElementById('nav').style.display = 'none';
  L = {q:[], done:0, mist:0, extra:false, bonus:0, hearts:3, boss:S.map.done + 1 >= S.map.n, usedW:new Set(), usedC:new Set(), usedB:new Set()};
  for (let i = lessonSize() * (L.boss ? 2 : 1); i > 0; i--) L.q.push(makeTask());
  const a = $app(); a.replaceChildren();
  const h = el('div', 'lh'), x = el('button', 'x', '✕'), bar = el('div', 'bar'), pct = el('b', '', '0%');
  bar.append(el('i')); h.append(x, bar, pct);
  if (L.boss) { L.hs = el('span', 'hearts'); h.append(L.hs); renderHearts(); }
  x.onclick = () => { if (confirm('Выйти из урока? Прогресс урока будет потерян.')) showMap(); };
  L.bar = bar.firstChild; L.pct = pct; L.body = el('div');
  a.append(h, L.body);
  nextTask();
}
const renderHearts = () => { if (L.hs) L.hs.textContent = '❤️'.repeat(L.hearts) + '🖤'.repeat(3 - L.hearts); };
function nextTask() {
  if (!L.q.length) return finish();
  const p = Math.round(L.done / (L.done + L.q.length) * 100);
  L.bar.style.width = p + '%'; L.pct.textContent = p + '%';
  L.body.replaceChildren(); L.body.style.paddingBottom = '';
  const t = L.q[0]; t.tries = 0;
  R[t.type](t, L.body);
}
function answer(t, ok, info) {
  S.answered++; if (ok) S.correct++; else { L.mist++; if (L.boss) { L.hearts--; renderHearts(); } }
  const bn = ok && t.bonus ? t.bonus : 0; L.bonus += bn;
  t.keys.forEach(k => { S.skill[k] = Math.max(0, sk(k) + (ok ? 1 : -1)); });
  beep(ok ? SND.ok : SND.bad);
  const fb = el('div', 'fb ' + (ok ? 'ok' : 'bad')), btn = el('button', 'btn', 'Дальше');
  fb.append(el('b', '', ok ? 'Верно!' + (t.flag ? ' (есть небольшая ошибка)' : '') + (bn ? ' +' + bn + ' XP за знаки' : '') : 'Неверно. ' + (info || '')), btn);
  document.body.append(fb);
  document.querySelectorAll('#app button:not(.x), #app input').forEach(b => { b.disabled = true; });
  btn.onclick = () => {
    fb.remove();
    if (L.boss && L.hearts <= 0) return lose();
    if (ok || t.once) { L.q.shift(); L.done++; } else L.q.push(L.q.shift());
    if (t.flag && !L.extra && WL.length) { L.extra = true; const lw = freshWords(); if (lw.length) L.q.push(MK.write(lw)); }
    nextTask();
  };
}
function finish() {
  const boss = L.boss, base = boss ? 30 : Math.max(3, 10 - 2 * L.mist), gain = base + L.bonus;
  S.lessons++; S.xp += gain; S.map.done++;
  if (S.last !== today()) { S.streak = S.last === yest() ? S.streak + 1 : 1; S.last = today(); }
  S.hist.push({xp: gain, t: Date.now()}); S.hist = S.hist.slice(-10);
  if (boss) { S.maps++; S.map = newMap(); }
  save(); beep(SND.end);
  const a = $app(); a.replaceChildren();
  const bar = el('div', 'bar'), i = el('i'), num = el('div', 'big', '+0 XP');
  bar.append(i);
  a.append(el('h2', '', boss ? 'Карта пройдена!' : 'Урок пройден!'), bar, num, el('p', 'dim', 'Ошибок: ' + L.mist + (L.bonus ? ' · знаки +' + L.bonus : '')));
  setTimeout(() => { i.style.width = '100%'; }, 50);
  let n = 0; const iv = setInterval(() => { n++; num.textContent = '+' + n + ' XP'; num.classList.add('pop'); if (n >= gain) clearInterval(iv); }, 70);
  const b = el('button', 'btn', 'Продолжить'); b.onclick = showMap; a.append(b);
}

function lose() {
  beep(SND.bad);
  const a = $app(); a.replaceChildren();
  const b = el('button', 'btn', 'Попробовать снова'), m = el('button', 'btn ghost', 'На карту');
  b.onclick = startLesson; m.onclick = showMap; m.style.marginLeft = '10px';
  a.append(el('h2', '', 'Жизни закончились 🖤'), el('p', 'dim', 'Опыт за этот урок не начислен. Попробуй ещё раз.'), b, m);
}
// +1 за каждый верно поставленный знак (мягкость, твёрдость, значение гласной, lane)
function marksBonus(T, tc) {
  let n = 0;
  T.filter(c => c.t !== 'end').forEach((u, i) => {
    const w = tc[i]; if (!w || w.t === 'sp') return;
    const exp = [...(w.m || []), ...(w.lane ? ['lane'] : []), ...(w.vm ? [w.vm] : [])], got = [...(u.m || []), ...(u.lane ? ['lane'] : [])];
    n += exp.filter(m => got.includes(m)).length;
  });
  return n;
}

/* ===== отрисовка заданий ===== */
const R = {
  match(t, h) {
    h.append(el('div', 'prompt', 'Укажите ' + promptOf(t.target)));
    const g = el('div', 'grid'), id = cellId(t.target);
    t.opts.forEach(c => {
      const b = el('button', 'tile'); b.append(cellEl(c));
      b.onclick = () => { const ok = cellId(c) === id; g.querySelectorAll('.tile').forEach((x, i) => { if (cellId(t.opts[i]) === id) x.classList.add('ok'); }); if (!ok) b.classList.add('bad'); answer(t, ok, 'Правильный ответ выделен.'); };
      g.append(b);
    });
    h.append(g);
  },
  build(t, h) {
    h.append(el('div', 'prompt', 'Составьте символ: ' + t.text));
    const sel = {}, prev = el('div'), parts = el('div', 'parts'), chk = el('button', 'btn', 'Проверить');
    const draw = () => {
      let c = null;
      if (sel.c) c = {t:'c',c:sel.c,v:sel.v || null,lane:!!sel.lane,m:[sel.m1, sel.m2].filter(Boolean)};
      else if (sel.v) c = {t:'v',v:sel.v,m:[sel.m1, sel.m2].filter(Boolean)};
      prev.replaceChildren(cellsEl(c ? [c] : [], '72px'));
    };
    t.parts.forEach(p => {
      const b = el('button', 'tile');
      b.append(cellEl(p.g === 'c' ? mkCell(p.k) : p.g === 'v' ? {t:'v',v:p.k,m:[]} : {t:'icon',p:'marks/' + p.k,name:p.k}));
      b.onclick = () => {
        const was = sel[p.g] === p.k; parts.querySelectorAll('.tile').forEach((x, i) => { if (t.parts[i].g === p.g) x.classList.remove('sel'); });
        if (was) delete sel[p.g]; else { sel[p.g] = p.k; b.classList.add('sel'); }
        draw();
      };
      parts.append(b);
    });
    chk.onclick = () => {
      const g = t.g, ok = sel.c === g.c && (sel.v || null) === (g.v || null) && !!sel.lane === g.lane && (sel.m1 || null) === (g.m1 || null) && (sel.m2 || null) === (g.m2 || null);
      answer(t, ok, 'Нужно: ' + t.text);
    };
    h.append(prev, parts, chk); draw();
  },
  pairs(t, h) {
    h.append(el('div', 'prompt', 'Соедините пары'));
    const g = el('div', 'pairs'), L1 = el('div'), R1 = el('div');
    [L1, R1].forEach(c => { c.style.cssText = 'display:flex;flex-direction:column;gap:10px'; });
    let sel = null, matched = 0, bad = 0;
    const small = t.items[0].word ? '28px' : null;
    t.items.forEach((it, i) => {
      const b = el('button', 'tile'); if (small) b.style.setProperty('--g', small);
      const w = el('div'); w.style.cssText = 'display:flex;gap:2px'; it.cells.forEach(c => w.append(cellEl(c))); b.append(w);
      b.onclick = () => { L1.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); sel = {i, b}; b.classList.add('sel'); };
      L1.append(b);
    });
    shuffle(t.items.map((it, i) => ({i, text: it.text}))).forEach(o => {
      const b = el('button', 'tile txt', o.text);
      b.onclick = () => {
        if (!sel) return;
        if (sel.i === o.i) { sel.b.classList.add('gone'); b.classList.add('gone'); sel = null; if (++matched === t.items.length) answer(t, bad === 0, 'Были ошибки в парах.'); }
        else { bad++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 300); }
      };
      R1.append(b);
    });
    g.append(L1, R1); h.append(g);
  },
  translate(t, h) {
    h.append(el('div', 'prompt', 'Прочитайте слово и напишите по-русски'), cellsEl(t.cells, '56px'));
    const inp = el('input', 'inp'), chk = el('button', 'btn', 'Проверить');
    inp.placeholder = 'Ответ'; inp.autocomplete = 'off';
    const norm = s => s.toLowerCase().replace(/ё/g, 'е').trim();
    const go = () => {
      const v = norm(inp.value), w = norm(t.w);
      if (!v) return;
      const ok = v === w || (w.length >= 4 && lev([...v], [...w]) <= 1);
      if (!ok && t.tries < 1) { t.tries++; inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 300); inp.select(); return; }
      answer(t, ok, 'Правильно: ' + t.w);
    };
    chk.onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    h.append(inp, chk); inp.focus();
  },
  write(t, h) {
    h.append(el('div', 'prompt', 'Напишите слово: ' + t.w), el('div', 'dim', 'Верные знаки сверху и lane дают +1 XP за каждый'));
    const T = [], out = el('div', 'out'), chk = el('button', 'btn', 'Проверить'), dock = el('div', 'dock');
    out.style.setProperty('--g', '48px');
    const draw = () => { out.replaceChildren(...T.map(cellEl)); };
    chk.onclick = () => {
      const d = lev(sig(T), sig(t.cells));
      if (d > 1 && t.tries < 1) { t.tries++; out.classList.add('shake'); setTimeout(() => out.classList.remove('shake'), 300); return; }
      if (d === 1) t.flag = true; else if (d === 0) t.bonus = marksBonus(T, t.cells);
      answer(t, d <= 1, 'Правильно: ' + t.w);
    };
    dock.append(chk, keyboard(T, draw)); h.append(out, dock); h.style.paddingBottom = '330px'; draw();
  }
};

/* ================= ЭКРАНЫ ================= */
function nav(v) { document.getElementById('nav').style.display = 'flex'; document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === v)); }
function showMap() {
  nav('map'); const a = $app(); a.replaceChildren();
  const top = el('div', 'top'); top.append(el('b', '', '🔥 ' + streakNow()), el('b', '', S.xp + ' XP'));
  const m = el('div', 'map'); m.style.setProperty('--map', S.map.color);
  for (let i = 0; i < S.map.n; i++) {
    const b = el('button', 'node ' + (i === S.map.n - 1 ? 'boss ' : '') + (i < S.map.done ? 'done' : i === S.map.done ? 'act' : ''), i < S.map.done ? '✓' : i === S.map.n - 1 ? '♛' : S.map.shapes[i]);
    if (i === S.map.done) b.onclick = startLesson; else b.disabled = true;
    m.append(b);
  }
  a.append(top, m, el('p', 'dim', 'Нажми на светящийся круг, чтобы начать урок.'));
}
function showAccount() {
  nav('account'); const a = $app(); a.replaceChildren();
  const nick = el('input', 'inp'); nick.value = S.nick; nick.maxLength = 20;
  nick.onchange = () => { S.nick = nick.value.trim() || S.nick; save(); };
  const known = Object.keys(S.skill).filter(k => (k[0] === 'c' || k[0] === 'v' || k[0] === 'i') && learned(k)).length;
  const st = el('div', 'card stats');
  [['Всего опыта', S.xp], ['Уроков пройдено', S.lessons], ['Точность', S.answered ? Math.round(S.correct / S.answered * 100) + '%' : '—'], ['Изучено символов', known], ['Карт пройдено', S.maps], ['Страйк', '🔥 ' + streakNow()]].forEach(([k, v]) => { const d = el('div'); d.append(el('b', '', String(v)), el('span', 'dim', k)); st.append(d); });
  const ch = el('div', 'card'), cc = el('div', 'chart'), mx = Math.max(10, ...S.hist.map(h => h.xp));
  S.hist.forEach(h => { const d = el('div'); d.style.height = h.xp / mx * 100 + '%'; d.append(el('span', '', h.xp)); cc.append(d); });
  ch.append(el('b', '', 'Опыт за последние уроки'), S.hist.length ? cc : el('p', 'dim', 'Пока нет пройденных уроков.'));
  const sb = el('button', 'btn ghost', 'Настройки'); sb.onclick = showSettings;
  a.append(el('h2', '', 'Аккаунт'), el('div', 'dim', 'Ник'), nick, st, ch, sb);
}
function showSettings() {
  nav('account'); const a = $app(); a.replaceChildren();
  const snd = el('button', 'btn ghost', 'Звук: ' + (S.sound ? 'включён' : 'выключен'));
  snd.onclick = () => { S.sound = !S.sound; save(); showSettings(); };
  const rs = el('button', 'btn ghost', 'Сбросить данные');
  rs.onclick = () => {
    if (confirm('Сбросить все данные?') && confirm('Точно? Весь прогресс будет удалён.') && confirm('Последнее подтверждение: удалить всё без возможности вернуть?')) { try { localStorage.removeItem(KEY); } catch (e) {} load(); showMap(); }
  };
  const bk = el('button', 'btn ghost', '← Назад'); bk.onclick = showAccount;
  [snd, rs, bk].forEach(b => { b.style.cssText = 'display:block;width:100%;margin-bottom:10px'; });
  a.append(el('h2', '', 'Настройки'), snd, rs, bk);
}

/* ================= СТАРТ ================= */
function main() {
  load();
  document.querySelectorAll('#nav button').forEach(b => { b.onclick = () => (b.dataset.go === 'map' ? showMap : showAccount)(); });
  showMap();
}
if (typeof document !== 'undefined') main();
