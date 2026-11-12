// Interface do provador 3D: look, cores, tamanhos, sugestões.
import { PRODUCTS, byId, brl, GENDER_LABEL, SLOT_LABEL } from './data.js';
const $ = (s, r = document) => r.querySelector(s);
const FIT = { PP: -2, P: -1, M: 0, G: 1, GG: 2, '41 mm': 0, '45 mm': 1 };
const NEUTRAL = { top: { color: '#3a393f', accent: '#232227' }, bottom: { color: '#2f2e33', accent: '#1b1915' } };
const BASE = { m: { top: 'tee', bottom: 'short' }, f: { top: 'bra', bottom: 'legging' } };

export function initRoom({ sfx, cart, toast }) {
  const el = $('#room'), stage = $('#stage'), tray = $('#tray');
  const S = { gender: 'm', look: {}, active: 'top', full: true };
  let fit = null, loading = null;
  const item = () => S.look[S.active];
  const okGender = (p) => p.gender === 'u' || p.gender === S.gender;

  function ensure() {
    loading ??= import('./fitting.js').then((m) => m.createFitting($('#gl'), (p) => ($('#loadBar').style.width = 5 + p * 95 + '%')))
      .then((f) => { fit = f; $('#loader').classList.add('done'); return f; })
      .catch((e) => { console.error(e); $('.loader-box span').textContent = 'Não foi possível carregar o 3D neste dispositivo.'; throw e; });
    return loading;
  }

  function apply() {
    const a = item(); stage.style.setProperty('--tint', a.p.colors[a.ci].hex);
    if (!fit) return;
    for (const slot of ['top', 'bottom']) {
      const it = S.look[slot];
      const g = it ? { type: it.p.type, ...pick(it), fit: FIT[it.p.sizes[it.si]], hero: slot === S.active } : { type: BASE[S.gender][slot], ...NEUTRAL[slot] };
      fit[slot === 'top' ? 'setTop' : 'setBottom'](g);
    }
    const w = S.look.watch;
    fit.setWatch(w ? { ...pick(w), fit: FIT[w.p.sizes[w.si]], hero: S.active === 'watch' } : null);
    fit.setFocus(S.full ? 'full' : S.active === 'watch' ? 'wrist' : S.active);
  }
  const pick = (it) => ({ color: it.p.colors[it.ci].hex, accent: it.p.colors[it.ci].accent });

  // ---------- trilhos deslizantes (cor / tamanho)
  function rail(node, onPick) {
    let idx = 0, t, drag = null, moved = false;
    const center = (i, smooth = true) => { const b = node.children[i]; if (b) node.scrollTo({ left: b.offsetLeft - (node.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' }); };
    const mark = (i) => { idx = i; [...node.children].forEach((b, j) => b.classList.toggle('is-on', j === i)); };
    node.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => {
      const mid = node.scrollLeft + node.clientWidth / 2; let best = 0, bd = 1e9;
      [...node.children].forEach((b, j) => { const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = j; } });
      if (best !== idx && !drag) { mark(best); onPick(best); }
    }, 110); });
    node.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || moved) return; const i = [...node.children].indexOf(b); center(i); if (i !== idx) { mark(i); onPick(i); } });
    node.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; drag = { x: e.clientX, s: node.scrollLeft }; moved = false; });
    addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 5) { moved = true; node.classList.add('grabbing'); } node.scrollLeft = drag.s - dx; });
    addEventListener('pointerup', () => { if (!drag) return; drag = null; node.classList.remove('grabbing'); node.dispatchEvent(new Event('scroll')); });
    return { set(html, i) { node.innerHTML = html; mark(i); requestAnimationFrame(() => center(i, false)); }, step(d) { const i = Math.max(0, Math.min(node.children.length - 1, idx + d)); if (i !== idx) { center(i); mark(i); onPick(i); } } };
  }
  const colorRail = rail($('#colorRail'), (i) => { item().ci = i; $('#colorName').textContent = item().p.colors[i].name; sfx.play('swipe'); apply(); });
  const sizeRail = rail($('#sizeRail'), (i) => { item().si = i; $('#sizeName').textContent = item().p.sizes[i]; sfx.play('tick'); apply(); });

  // ---------- render
  function render() {
    const { p, ci, si } = item();
    $('#pLane').textContent = 'Raia ' + p.lane; $('#pGender').textContent = GENDER_LABEL[p.gender] + ' · ' + p.cat;
    $('#pName').textContent = p.name; $('#pTag').textContent = p.tag; $('#pDesc').textContent = p.desc;
    $('#pFeats').innerHTML = p.feats.map((f) => `<li>${f}</li>`).join('');
    ['#pName', '#pTag', '#pDesc'].forEach((s) => { const n = $(s); n.classList.remove('swap'); void n.offsetWidth; n.classList.add('swap'); });
    $('#ghost').textContent = (p.name + ' ✦ ').repeat(6);
    colorRail.set(p.colors.map((c) => `<button style="background:${c.hex}" aria-label="${c.name}"></button>`).join(''), ci);
    sizeRail.set(p.sizes.map((s) => `<button>${s.replace(' mm', '')}</button>`).join(''), si);
    $('#colorName').textContent = p.colors[ci].name; $('#sizeName').textContent = p.sizes[si];
    const n = Object.keys(S.look).length;
    $('#slots').innerHTML = ['top', 'bottom', 'watch'].map((s) => { const it = S.look[s];
      return it ? `<button class="slot ${s === S.active ? 'is-on' : ''}" data-s="${s}"><small>${SLOT_LABEL[s]}</small><b>${it.p.name}</b>${n > 1 ? `<span class="rm" data-rm="${s}" title="Remover">✕</span>` : ''}</button>`
        : `<button class="slot empty" data-s="${s}"><small>${SLOT_LABEL[s]}</small><b>+ adicionar</b></button>`; }).join('');
    const total = Object.values(S.look).reduce((a, it) => a + it.p.price, 0);
    $('#lookTotal').textContent = brl(total); $('#addLook').textContent = n > 1 ? `Adicionar look (${n})` : 'Adicionar à sacola';
    const recs = PRODUCTS.filter((r) => okGender(r) && !Object.values(S.look).some((it) => it.p.id === r.id)).sort((a, b) => (a.slot === S.active) - (b.slot === S.active));
    $('#trayList').innerHTML = recs.map((r) => `<button class="rec" data-id="${r.id}"><img src="assets/img/${r.img}.jpg" alt="" loading="lazy"><b>${r.name}</b><span>${brl(r.price)}<u>+ vestir</u></span></button>`).join('');
    document.querySelectorAll('#genderSeg button').forEach((b) => b.classList.toggle('is-on', b.dataset.g === S.gender));
    $('#focusBtn').textContent = S.full ? '⌖ Ver detalhe' : '⤢ Corpo inteiro';
  }

  function wear(p, quiet) {
    S.look[p.slot] = { p, ci: 0, si: Math.min(2, p.sizes.length - 1) }; S.active = p.slot; if (p.slot === 'watch') S.full = false;
    render(); apply(); fit?.pulse(); if (!quiet) { sfx.play('pop'); toast(`${p.name} entrou no look`); }
  }
  function setGender(g) {
    if (g === S.gender) return; S.gender = g; const swapped = [];
    for (const [slot, it] of Object.entries(S.look)) if (!okGender(it.p)) { const tw = byId(it.p.twin); if (tw) { S.look[tw.slot] = { p: tw, ci: 0, si: it.si }; if (tw.slot !== slot) delete S.look[slot]; swapped.push(tw.name); } else delete S.look[slot]; }
    if (!S.look[S.active]) S.active = Object.keys(S.look)[0];
    fit?.setGender(g); render(); apply(); sfx.play('open');
    if (swapped.length) toast(`Versão ${GENDER_LABEL[g].toLowerCase()}: ${swapped.join(' + ')}`);
  }

  // ---------- eventos
  $('#slots').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]'); if (rm) { delete S.look[rm.dataset.rm]; if (!S.look[S.active]) S.active = Object.keys(S.look)[0]; render(); apply(); sfx.play('tick'); return; }
    const b = e.target.closest('.slot'); if (!b) return;
    if (S.look[b.dataset.s]) { S.active = b.dataset.s; S.full = false; render(); apply(); sfx.play('tick'); }
    else { tray.classList.add('open'); const first = PRODUCTS.find((r) => r.slot === b.dataset.s && okGender(r)); $(`.rec[data-id="${first?.id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }); }
  });
  $('#trayList').addEventListener('click', (e) => { const b = e.target.closest('.rec'); if (b) wear(byId(b.dataset.id)); });
  $('#genderSeg').addEventListener('click', (e) => e.target.dataset.g && setGender(e.target.dataset.g));
  $('#motionSeg').addEventListener('click', (e) => { const m = e.target.dataset.m; if (!m) return; fit?.setMotion(m); [...e.currentTarget.children].forEach((b) => b.classList.toggle('is-on', b === e.target)); sfx.play('tick'); });
  $('#focusBtn').addEventListener('click', () => { S.full = !S.full; render(); apply(); sfx.play('tick'); });
  $('#gl').addEventListener('pointerdown', () => $('#hint').classList.add('gone'), { once: true });
  { let y0 = null; const h = $('#trayHandle');
    h.addEventListener('pointerdown', (e) => { y0 = e.clientY; h.setPointerCapture(e.pointerId); });
    h.addEventListener('pointerup', (e) => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null; tray.classList.toggle('open', dy < -15 ? true : dy > 15 ? false : !tray.classList.contains('open')); sfx.play('swipe'); }); }
  $('#addLook').addEventListener('click', () => {
    cart.add(Object.values(S.look).map((it) => ({ id: it.p.id, name: it.p.name, img: it.p.img, price: it.p.price, color: it.p.colors[it.ci].name, hex: it.p.colors[it.ci].hex, size: it.p.sizes[it.si] })));
  });
  $('#roomClose').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (!el.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') colorRail.step(1); if (e.key === 'ArrowLeft') colorRail.step(-1); });

  async function open(id, ev) {
    const p = byId(id); if (!p) return;
    el.style.setProperty('--ox', (ev?.clientX ?? innerWidth / 2) + 'px'); el.style.setProperty('--oy', (ev?.clientY ?? innerHeight / 2) + 'px');
    if (p.gender !== 'u') S.gender = p.gender;
    S.look = {}; S.full = true; tray.classList.remove('open');
    el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll'); sfx.play('open');
    wear(p, true);
    try { const f = await ensure(); f.setGender(S.gender); apply(); f.start(); } catch {}
  }
  function close() { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll'); setTimeout(() => !el.classList.contains('open') && fit?.stop(), 800); }
  return { open, close, preload: ensure };
}
