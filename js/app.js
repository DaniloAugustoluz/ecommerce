// PISTA Athletic Club — vitrine, som, sacola e checkout demonstrativo.
import { PRODUCTS, brl, GENDER_LABEL } from './data.js';
import { initRoom } from './room.js';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- SOM: efeitos e batida sintetizados (WebAudio, sem arquivos) ---------- */
const sfx = (() => {
  let ctx, master, on = false, timer, step = 0, next = 0;
  const tone = (f, d = 0.12, type = 'sine', v = 0.25, t = ctx.currentTime, slide) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
  };
  const noise = (d = 0.2, v = 0.15, f0 = 800, f1 = 4000, t = ctx.currentTime) => {
    const n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; fl.type = 'bandpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(fl).connect(g).connect(master); s.start(t);
  };
  const BASS = [55, 0, 55, 0, 0, 65.4, 0, 55, 49, 0, 49, 0, 0, 73.4, 0, 65.4], LEAD = { 0: 440, 3: 523, 6: 659, 10: 523, 12: 392 };
  const beat = () => { while (next < ctx.currentTime + 0.15) { const s = step % 16;
    if (s % 4 === 0) tone(110, 0.2, 'sine', 0.3, next, 42); if (s % 4 === 2) noise(0.04, 0.03, 7000, 9000, next); if (s % 8 === 4) noise(0.1, 0.06, 1500, 2600, next);
    if (BASS[s]) tone(BASS[s], 0.15, 'triangle', 0.13, next); if (LEAD[s] && step % 32 > 15) tone(LEAD[s], 0.09, 'square', 0.018, next);
    next += 60 / 116 / 4; step++; } };
  const FX = {
    tick: () => tone(880, 0.05, 'square', 0.06), swipe: () => noise(0.25, 0.12, 600, 5000), beep: () => tone(660, 0.14, 'square', 0.12), go: () => tone(1320, 0.5, 'square', 0.12),
    pop: () => { tone(520, 0.09, 'triangle', 0.25); tone(780, 0.14, 'triangle', 0.2, ctx.currentTime + 0.07); },
    open: () => { noise(0.4, 0.1, 300, 3000); tone(220, 0.4, 'sine', 0.16, ctx.currentTime, 660); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.22, ctx.currentTime + i * 0.11)),
  };
  return {
    get on() { return on; },
    enable(v) { on = v; clearInterval(timer); $('#soundBtn').classList.toggle('off', !v); if (!v) return;
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); }
      ctx.resume(); next = ctx.currentTime + 0.05; timer = setInterval(beat, 50); },
    play(n) { if (on && ctx) FX[n]?.(); },
  };
})();

const toastEl = $('#toast'); let toastT;
const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2400); };

/* ---------- SACOLA ---------- */
const cart = (() => {
  let items = []; try { items = JSON.parse(localStorage.getItem('pista-cart') || '[]'); } catch {}
  const drawer = $('#drawer'), scrim = $('#scrim');
  const total = () => items.reduce((a, i) => a + i.price * i.qty, 0);
  const save = () => { try { localStorage.setItem('pista-cart', JSON.stringify(items)); } catch {} };
  function render() {
    const n = items.reduce((a, i) => a + i.qty, 0), c = $('#cartCount'); c.textContent = n; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    $('#cartTotal').textContent = brl(total()); $('#checkoutBtn').disabled = !n; $('#checkoutBtn').style.opacity = n ? 1 : 0.4;
    $('#cartList').innerHTML = n ? items.map((i, k) => `<div class="item"><img src="assets/img/${i.img}.jpg" alt=""><div><h4>${i.name}</h4><p><i style="background:${i.hex}"></i>${i.color} · ${i.size}</p><b>${brl(i.price)}</b></div>
      <div class="qty"><button data-k="${k}" data-d="1">+</button><span>${i.qty}</span><button data-k="${k}" data-d="-1">−</button></div></div>`).join('')
      : `<div class="empty-cart"><span class="script">Sacola na linha de largada</span>Escolha uma peça e prove no 3D.</div>`;
    save();
  }
  const open = (v = true) => { drawer.classList.toggle('open', v); scrim.classList.toggle('on', v); drawer.setAttribute('aria-hidden', !v); };
  $('#cartList').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; const it = items[b.dataset.k]; it.qty += +b.dataset.d; if (it.qty < 1) items.splice(b.dataset.k, 1); sfx.play('tick'); render(); });
  $('#cartBtn').addEventListener('click', () => { open(); sfx.play('swipe'); }); $('#drawerClose').addEventListener('click', () => open(false)); scrim.addEventListener('click', () => open(false));
  render();
  return {
    add(list) { list.forEach((n) => { const key = n.id + n.color + n.size, f = items.find((i) => i.key === key); f ? f.qty++ : items.push({ ...n, key, qty: 1 }); });
      render(); sfx.play('pop'); toast(list.length > 1 ? `Look com ${list.length} peças na sacola` : `${list[0].name} na sacola`); open(); },
    clear() { items = []; render(); }, total, open,
  };
})();

/* ---------- CHECKOUT DEMONSTRATIVO ---------- */
{
  const modal = $('#checkout'); let method = 'pix';
  const qr = () => { let s = '<svg viewBox="0 0 21 21" shape-rendering="crispEdges">'; const eye = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { const inEye = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12); if (!inEye && Math.random() > 0.52) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }
    return s + eye(0, 0) + eye(14, 0) + eye(0, 14) + '</svg>'; };
  const view = () => { const t = cart.total(), fin = method === 'pix' ? t * 0.95 : t; $('#payTotal').textContent = brl(fin);
    $('#payView').innerHTML = method === 'pix' ? `${qr()}<p><b>QR Code ilustrativo.</b><br>Na versão final, o código Pix é gerado pela API de pagamento e a confirmação chega em segundos.</p>`
      : method === 'card' ? `<div class="fake-card"><span>PISTA CLUB</span><span>•••• •••• •••• 2026</span></div><p><b>6× de ${brl(t / 6)} sem juros.</b><br>Os dados do cartão serão digitados no ambiente seguro da operadora.</p>`
      : `<svg viewBox="0 0 60 30" preserveAspectRatio="none">${Array.from({ length: 30 }, (_, i) => `<rect x="${i * 2}" y="2" width="${Math.random() > 0.5 ? 1.4 : 0.6}" height="26"/>`).join('')}</svg><p><b>Boleto ilustrativo.</b><br>Vencimento em 3 dias úteis. O pedido é separado após a compensação.</p>`; };
  const show = (v) => { modal.classList.toggle('open', v); modal.setAttribute('aria-hidden', !v); };
  $('#checkoutBtn').addEventListener('click', () => { if (!cart.total()) return; $('#payStep').hidden = false; $('#payDone').hidden = true; view(); cart.open(false); show(true); sfx.play('open'); });
  $('#payOpts').addEventListener('click', (e) => { const b = e.target.closest('.pay'); if (!b) return; method = b.dataset.p; $$('.pay').forEach((p) => p.classList.toggle('is-on', p === b)); view(); sfx.play('tick'); });
  $('#payConfirm').addEventListener('click', () => { $('#orderId').textContent = '#PST-' + Math.floor(1000 + Math.random() * 9000); $('#payStep').hidden = true; $('#payDone').hidden = false; cart.clear(); sfx.play('win'); confetti(); });
  ['#checkoutClose', '#payBack'].forEach((s) => $(s).addEventListener('click', () => show(false)));
  modal.addEventListener('click', (e) => e.target === modal && show(false));
}
function confetti() {
  const cv = $('#confetti'), g = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const P = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - 0.5) * 22, vy: -Math.random() * 20 - 4, r: Math.random() * 7 + 4, a: Math.random() * 6, c: ['#e2492b', '#d3f23f', '#1b1915', '#fbf7ef'][Math.floor(Math.random() * 4)] }));
  let t = 0; (function loop() { g.clearRect(0, 0, cv.width, cv.height); P.forEach((p) => { p.vy += 0.55; p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.a += 0.2; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6); g.restore(); });
    if (++t < 170) requestAnimationFrame(loop); else g.clearRect(0, 0, cv.width, cv.height); })();
}

/* ---------- PROVADOR ---------- */
const room = initRoom({ sfx, cart, toast });
document.addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) room.open(b.dataset.open, e); });

/* ---------- VITRINE ---------- */
$('#grid').innerHTML = PRODUCTS.map((p) => `<button class="card rv" data-open="${p.id}" data-tags="${p.gender === 'u' ? 'm f' : p.gender} ${p.cat}" style="--c:${p.colors[0].hex}">
  <div class="card-img"><span class="card-lane">${p.lane}</span><span class="card-gender">${GENDER_LABEL[p.gender]}</span><img src="assets/img/${p.img}.jpg" alt="${p.name}" loading="lazy"><span class="card-try">Provar em 3D ↗</span></div>
  <div class="card-body"><h3>${p.name}</h3><span class="script">${p.tag}</span><div class="card-foot"><b>${brl(p.price)}</b><span class="dots">${p.colors.map((c) => `<i style="background:${c.hex}"></i>`).join('')}</span></div></div></button>`).join('');
$('#filters').addEventListener('click', (e) => { const f = e.target.dataset.f; if (!f) return; $$('#filters .chip').forEach((c) => c.classList.toggle('is-on', c === e.target));
  $$('.card').forEach((c) => c.classList.toggle('hide', f !== 'all' && !c.dataset.tags.split(' ').includes(f))); sfx.play('tick'); });
if (matchMedia('(hover:hover)').matches) $$('.card').forEach((c) => {
  c.addEventListener('mousemove', (e) => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; c.style.transform = `perspective(700px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-6px)`; });
  c.addEventListener('mouseleave', () => (c.style.transform = ''));
});
$('#marquee').innerHTML = '<span>CORRIDA <i>✦</i> ACADEMIA <i>✦</i> PROVADOR 3D <i>✦</i> FRETE GRÁTIS ACIMA DE R$ 299 <i>✦</i> TROCA EM 30 DIAS <i>✦</i> PIX COM 5% OFF <i>✦</i></span>'.repeat(4);
$('#swTicks').innerHTML = Array.from({ length: 60 }, (_, i) => `<line x1="104" y1="${134 - 76}" x2="104" y2="${134 - (i % 5 ? 70 : 64)}" transform="rotate(${i * 6} 104 134)"/>`).join('');

function startPage() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; const el = e.target; el.style.setProperty('--i', [...el.parentElement.children].indexOf(el) % 6); el.classList.add('in'); io.unobserve(el);
    if (el.classList.contains('card')) setTimeout(() => el.classList.remove('rv'), 1300);
    $$('[data-count]', el).forEach((b) => { const n = +b.dataset.count, t0 = performance.now(); (function up(t) { const k = Math.max(0, Math.min(1, (t - t0) / 1400)); b.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(up); })(t0); }); }), { threshold: 0.12 });
  $$('.rv').forEach((el) => io.observe(el));
  const looks = $$('.look img');
  const onScroll = () => { $('#nav').classList.toggle('scrolled', scrollY > 30); looks.forEach((im) => { const r = im.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const p = Math.max(-0.5, Math.min(0.5, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)); im.style.setProperty('--py', -5.3 - p * 10 + '%'); }); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  (window.requestIdleCallback || setTimeout)(() => room.preload().catch(() => {}), { timeout: 4000 });
}

/* ---------- PORTÃO DE LARGADA ---------- */
async function enter(withSound) {
  const gate = $('#gate'), cnt = $('#gateCount'); if (gate.classList.contains('go')) return;
  sfx.enable(withSound); gate.classList.add('go');
  for (const n of ['3', '2', '1']) { cnt.textContent = n; cnt.classList.remove('tick'); void cnt.offsetWidth; cnt.classList.add('tick'); sfx.play('beep'); await wait(300); }
  sfx.play('go'); gate.classList.add('open'); document.body.classList.remove('locked'); document.body.classList.add('entered'); startPage();
  setTimeout(() => gate.remove(), 1400);
}
$('#enter').addEventListener('click', () => enter(true));
$('#enterMute').addEventListener('click', () => enter(false));
$('#soundBtn').addEventListener('click', () => sfx.enable(!sfx.on));

/* ---------- LINK DIRETO: ?p=id-da-peca abre o provador; ?skip pula a largada ---------- */
{ const q = new URLSearchParams(location.search), p = q.get('p');
  if (p || q.has('skip')) enter(false).then(() => { if (q.has('rot') || q.has('m')) room.preload().then((f) => { if (q.has('rot')) f.setRot(+q.get('rot')); if (q.has('m')) f.setMotion(q.get('m')); }); return p && room.open(p); }); }

/* ---------- DEMO PERSONALIZADA: ?marca=Nome+da+Loja&cor=e2492b troca a marca e a cor de destaque ---------- */
{ const q = new URLSearchParams(location.search), marca = (q.get('marca') || '').trim().slice(0, 28), cor = q.get('cor');
  if (/^[0-9a-f]{6}$/i.test(cor || '')) document.documentElement.style.setProperty('--red', '#' + cor);
  if (marca) { const up = marca.toUpperCase(), ls = up.length > 9 ? '.04em' : '.14em';
    $$('.logo-mark').forEach((e) => { e.textContent = up; e.style.letterSpacing = ls; if (up.length > 12) e.style.fontSize = e.closest('.logo-lg') ? '2rem' : '1.15rem'; });
    $$('.logo-script').forEach((e) => (e.textContent = 'provador 3D'));
    document.title = marca + ' · Roupas de treino com provador 3D';
    const f = $('.footer p'); if (f) f.textContent = 'Demonstração preparada para ' + marca + ' · imagens de exemplo.'; } }
