const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const places = {
  forest: {
    label: 'ARQUIVO 01 · MIRKWOOD FOREST', title: 'Mirkwood', cls: 'place-forest',
    text: 'Às 03:17, todos os sons da floresta desaparecem ao mesmo tempo. Nem insetos, nem pássaros, nem vento.',
    evidence: 'EVIDÊNCIA / 06 NOV 1983 — Uma gravação em 88.7 MHz contém três batidas metálicas e uma voz infantil sob o ruído.'
  },
  school: {
    label: 'ARQUIVO 02 · HAWKINS HIGH', title: 'Hawkins High', cls: 'place-school',
    text: 'O corredor leste perdeu energia quatro noites seguidas. As lâmpadas voltam em uma sequência que não parece aleatória.',
    evidence: 'EVIDÊNCIA / PADRÃO 4-8-15-16 — O intervalo entre os pulsos coincide com as quedas de tensão registradas perto do laboratório.'
  },
  arcade: {
    label: 'ARQUIVO 03 · PALACE ARCADE', title: 'Palace Arcade', cls: 'place-arcade',
    text: 'Depois do fechamento, uma única máquina continua ligada. Não está conectada à tomada e exibe o mesmo placar desde o apagão.',
    evidence: 'EVIDÊNCIA / TERMINAL 07 — O monitor mostra coordenadas de Mirkwood por exatamente onze segundos antes de reiniciar.'
  },
  lab: {
    label: 'ARQUIVO 04 · ACESSO RESTRITO', title: 'Hawkins Lab', cls: 'place-lab',
    text: 'A planta oficial termina no piso B2. O elevador, porém, possui um terceiro indicador que nunca aparece durante o dia.',
    evidence: 'EVIDÊNCIA / SUBSOLO — Um registro rasurado menciona “barreira”, “eco biológico” e uma temperatura impossível.'
  },
  town: {
    label: 'ARQUIVO 05 · DOWNTOWN', title: 'Downtown Hawkins', cls: 'place-town',
    text: 'Os relógios de três lojas diferentes pararam no mesmo minuto. Nenhum deles voltou a funcionar.',
    evidence: 'EVIDÊNCIA / 03:17 AM — A rede elétrica registrou consumo negativo durante 4,2 segundos.'
  },
  mystery: {
    label: 'ARQUIVO 06 · CREEL HOUSE', title: 'Creel House', cls: 'place-mystery',
    text: 'A casa está vazia, mas há movimento atrás das cortinas. Vizinhos dizem ouvir um relógio mesmo quando a energia está cortada.',
    evidence: 'EVIDÊNCIA / FITA 12 — Quatro badaladas. Depois, silêncio. Depois, uma respiração que não pertence a quem estava gravando.'
  }
};

const state = {
  clues: new Set(JSON.parse(localStorage.getItem('hawkins-clues') || '[]')),
  current: null,
  crossed: localStorage.getItem('hawkins-crossed') === '1',
  revealLocked: false,
  audio: null
};

const intro = $('#intro');
const dialog = $('#placeDialog');
const dialogVisual = $('#dialogVisual');
const clueCount = $('#clueCount');
const progressBar = $('#progressBar');
const progressStatus = $('#progressStatus');
const crossGate = $('#crossGate');
const gateStatus = $('#gateStatus');
const toast = $('#toast');
const hero = $('#inicio');

function save() {
  localStorage.setItem('hawkins-clues', JSON.stringify([...state.clues]));
  localStorage.setItem('hawkins-crossed', state.crossed ? '1' : '0');
}

function message(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(message.timer);
  message.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function updateProgress() {
  const count = state.clues.size;
  clueCount.textContent = count;
  progressBar.style.width = `${(count / 6) * 100}%`;
  $$('.hotspot, .archive-card').forEach(el => el.classList.toggle('found', state.clues.has(el.dataset.place)));

  if (count === 0) progressStatus.textContent = 'Sinal estável. Por enquanto.';
  else if (count < 3) progressStatus.textContent = 'Interferência aumentando.';
  else if (count < 6) progressStatus.textContent = 'A passagem está respondendo.';
  else progressStatus.textContent = 'Todos os registros recuperados.';

  if (count >= 3) {
    crossGate.disabled = false;
    crossGate.classList.remove('locked');
    crossGate.textContent = state.crossed ? 'VOCÊ JÁ ATRAVESSOU' : 'ATRAVESSAR AGORA';
    gateStatus.textContent = state.crossed ? 'A barreira não voltou ao normal.' : 'A frequência caiu para 03:17.';
  } else {
    crossGate.disabled = true;
    crossGate.classList.add('locked');
    crossGate.textContent = `ENCONTRE ${3 - count} ${3 - count === 1 ? 'PISTA' : 'PISTAS'}`;
    gateStatus.textContent = 'A passagem ainda está fechada.';
  }

  document.body.classList.toggle('crossed', state.crossed);
}

function openPlace(id) {
  const place = places[id];
  if (!place) return;
  state.current = id;
  $('#dialogLabel').textContent = place.label;
  $('#dialogTitle').textContent = place.title;
  $('#dialogText').textContent = place.text;
  $('#dialogEvidence').textContent = place.evidence;
  dialogVisual.className = `dialog-visual ${place.cls}`;
  const button = $('#collectClue');
  button.textContent = state.clues.has(id) ? 'PISTA JÁ REGISTRADA' : 'REGISTRAR PISTA';
  button.disabled = state.clues.has(id);
  dialog.showModal();
  pulseAudio(84, .08);
}

$$('[data-place]').forEach(el => {
  el.addEventListener('click', () => openPlace(el.dataset.place));
});

$('#dialogClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

$('#collectClue').addEventListener('click', () => {
  if (!state.current || state.clues.has(state.current)) return;
  state.clues.add(state.current);
  save();
  updateProgress();
  $('#collectClue').textContent = 'PISTA REGISTRADA';
  $('#collectClue').disabled = true;
  message(`ARQUIVO ${String(state.clues.size).padStart(2, '0')} RECUPERADO`);
  pulseAudio(52, .14);
  setTimeout(() => dialog.close(), 850);
});

function setReveal(x, y, radius) {
  hero.style.setProperty('--mx', `${x}px`);
  hero.style.setProperty('--my', `${y}px`);
  hero.style.setProperty('--reveal', radius);
}

hero.addEventListener('pointermove', e => {
  if (state.revealLocked) return;
  const r = hero.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const size = matchMedia('(max-width: 700px)').matches ? '105px' : '180px';
  setReveal(x, y, size);
});
hero.addEventListener('pointerleave', () => { if (!state.revealLocked) hero.style.setProperty('--reveal', '0px'); });

$('#tearReality').addEventListener('click', () => {
  state.revealLocked = !state.revealLocked;
  hero.style.setProperty('--mx', '66%');
  hero.style.setProperty('--my', '52%');
  hero.style.setProperty('--reveal', state.revealLocked ? '145vmax' : '0px');
  pulseAudio(38, .2);
  message(state.revealLocked ? 'A REALIDADE ESTÁ CEDENDO' : 'SINAL RESTAURADO');
});

crossGate.addEventListener('click', () => {
  if (state.clues.size < 3) return;
  state.crossed = true;
  state.revealLocked = true;
  hero.style.setProperty('--reveal', '160vmax');
  document.body.classList.add('crossed');
  save();
  updateProgress();
  pulseAudio(31, .3);
  message('VOCÊ ATRAVESSOU');
  setTimeout(() => $('#finale').scrollIntoView({ behavior: 'smooth' }), 550);
});

$('#resetCase').addEventListener('click', () => {
  state.clues.clear();
  state.crossed = false;
  state.revealLocked = false;
  localStorage.removeItem('hawkins-clues');
  localStorage.removeItem('hawkins-crossed');
  hero.style.setProperty('--reveal', '0px');
  updateProgress();
  message('INVESTIGAÇÃO REINICIADA');
  $('#inicio').scrollIntoView({ behavior: 'smooth' });
});

$('#menuButton').addEventListener('click', () => $('#mobileNav').classList.toggle('open'));
$$('#mobileNav a').forEach(a => a.addEventListener('click', () => $('#mobileNav').classList.remove('open')));

function enter(withAudio) {
  intro.classList.add('is-hidden');
  if (withAudio) startAudio();
  setTimeout(() => intro.remove(), 1100);
}
$('#enterExperience').addEventListener('click', () => enter(true));
$('#enterSilent').addEventListener('click', () => enter(false));

function startAudio() {
  if (state.audio) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const master = ctx.createGain();
  master.gain.value = .055;
  master.connect(ctx.destination);

  const drone = ctx.createOscillator();
  drone.type = 'sine';
  drone.frequency.value = 43;
  const droneGain = ctx.createGain();
  droneGain.gain.value = .5;
  drone.connect(droneGain).connect(master);
  drone.start();

  const second = ctx.createOscillator();
  second.type = 'triangle';
  second.frequency.value = 64.5;
  const secondGain = ctx.createGain();
  secondGain.gain.value = .14;
  second.connect(secondGain).connect(master);
  second.start();

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .22;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer; noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 700;
  const noiseGain = ctx.createGain(); noiseGain.gain.value = .13;
  noise.connect(filter).connect(noiseGain).connect(master); noise.start();

  state.audio = { ctx, master, drone, second };
  $('#soundToggle').classList.add('on');
}

function pulseAudio(freq = 60, volume = .1) {
  if (!state.audio) return;
  const { ctx, master } = state.audio;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .55);
  osc.connect(gain).connect(master); osc.start(); osc.stop(ctx.currentTime + .58);
}

$('#soundToggle').addEventListener('click', () => {
  if (!state.audio) { startAudio(); return; }
  const { ctx, master } = state.audio;
  const muted = master.gain.value < .001;
  master.gain.setTargetAtTime(muted ? .055 : .0001, ctx.currentTime, .04);
  $('#soundToggle').classList.toggle('on', muted);
});

const canvas = $('#spores');
const g = canvas.getContext('2d');
let particles = [];
function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(85, Math.max(28, Math.floor(innerWidth / 18)));
  particles = Array.from({ length: count }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.6 + .3, vx: Math.random() * .14 - .07, vy: Math.random() * .28 + .08, a: Math.random() * .38 + .08 }));
}
function drawSpores() {
  g.clearRect(0, 0, innerWidth, innerHeight);
  const red = document.body.classList.contains('crossed');
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.y > innerHeight + 4) { p.y = -4; p.x = Math.random() * innerWidth; }
    if (p.x < -4) p.x = innerWidth + 4; if (p.x > innerWidth + 4) p.x = -4;
    g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fillStyle = red ? `rgba(255,58,45,${p.a})` : `rgba(210,225,230,${p.a})`; g.fill();
  });
  requestAnimationFrame(drawSpores);
}
resizeCanvas(); drawSpores();
addEventListener('resize', resizeCanvas, { passive: true });

let lastScroll = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  document.querySelector('.topbar').style.background = y > 50 ? 'rgba(3,4,5,.88)' : '';
  lastScroll = y;
}, { passive: true });

setInterval(() => {
  if (document.hidden || Math.random() > .28) return;
  document.body.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(.72)' }, { filter: 'brightness(1.08)' }, { filter: 'brightness(1)' }], { duration: 145 });
}, 4800);

updateProgress();
if (state.crossed) hero.style.setProperty('--reveal', '160vmax');
