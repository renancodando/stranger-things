const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const body = document.body;
const hero = $('#inicio');
const gate = $('#gate');
const toast = $('#toast');

const places = {
  forest:{label:'ARQUIVO 01 · MIRKWOOD',title:'Mirkwood Forest',image:'assets/forest.webp',text:'Às 03:17, todos os sons da mata desaparecem por exatamente onze segundos. O gravador continua funcionando, mas registra uma segunda respiração.',evidence:'EVIDÊNCIA: fita cassete 88.7 FM — ruído com padrão repetido em intervalos de 11 segundos.'},
  school:{label:'ARQUIVO 02 · HAWKINS HIGH',title:'A escola',image:'assets/school.webp',text:'O corredor leste perde energia mesmo isolado da rede. As lâmpadas piscam em grupos de três, oito e sete.',evidence:'EVIDÊNCIA: sequência elétrica 3—8—7. Pode ser uma frequência ou coordenada.'},
  arcade:{label:'ARQUIVO 03 · PALACE ARCADE',title:'Palace Arcade',image:'assets/arcade.webp',text:'Uma máquina sem ficha continua registrando pontuações durante os apagões. O nome no topo muda toda madrugada.',evidence:'EVIDÊNCIA: placar impossível — “RUN / 03:17 / RUN”. Sem alimentação externa.'},
  lab:{label:'ARQUIVO 04 · RESTRITO',title:'Hawkins Lab',image:'assets/lab.webp',text:'A planta oficial termina no subsolo B2. O elevador, porém, possui um botão sem inscrição que desce por mais vinte e três segundos.',evidence:'EVIDÊNCIA: mapa parcial do nível B3. Uma sala circular foi apagada do documento.'},
  town:{label:'ARQUIVO 05 · CENTRO',title:'Downtown Hawkins',image:'assets/town.webp',text:'Relógios eletrônicos de quatro lojas diferentes congelaram no mesmo minuto. Nenhum deles estava conectado.',evidence:'EVIDÊNCIA: 03:17:11 — horário repetido em todos os registros.'},
  mystery:{label:'ARQUIVO 06 · CREEL',title:'Creel House',image:'assets/mystery.webp',text:'Vizinhos relatam um sino onde não há relógio funcionando. A gravação mostra uma frequência abaixo da audição humana.',evidence:'EVIDÊNCIA: onda de 19 Hz. O pico coincide com cada queda de energia em Hawkins.'}
};

let currentPlace = null;
let found = new Set(JSON.parse(localStorage.getItem('hawkins-clues') || '[]'));
let audio = null;
let audioEnabled = false;
let fullReality = false;

function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),2600)}
function save(){localStorage.setItem('hawkins-clues',JSON.stringify([...found]));renderProgress()}
function renderProgress(){
  $('#clueCount').textContent=found.size;
  $('#progressBar').style.width=`${found.size/6*100}%`;
  $$('.hotspot').forEach(h=>h.classList.toggle('found',found.has(h.dataset.place)));
  const status=$('#progressStatus');
  status.textContent=found.size<3?'Sinal estável. Por enquanto.':found.size<6?'A frequência está mudando.':'Todas as anomalias registradas.';
  const cross=$('#crossGate');
  if(found.size>=3){cross.disabled=false;cross.classList.remove('locked');cross.innerHTML='ATRAVESSAR AGORA <span>↗</span>';$('#gateStatus').textContent='A passagem está respondendo.'}
}
function openPlace(key){
  const p=places[key]; if(!p)return; currentPlace=key;
  $('#dialogImage').src=p.image;$('#dialogImage').alt=p.title;$('#dialogLabel').textContent=p.label;$('#dialogTitle').textContent=p.title;$('#dialogText').textContent=p.text;$('#dialogEvidence').textContent=p.evidence;
  const btn=$('#collectClue');btn.textContent=found.has(key)?'PISTA JÁ REGISTRADA':'REGISTRAR PISTA ＋';btn.disabled=found.has(key);
  $('#placeDialog').showModal();
}
$$('.hotspot,.location-card').forEach(el=>{
  el.addEventListener('click',()=>openPlace(el.dataset.place));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')openPlace(el.dataset.place)});
});
$('#dialogClose').addEventListener('click',()=>$('#placeDialog').close());
$('#placeDialog').addEventListener('click',e=>{if(e.target===$('#placeDialog'))$('#placeDialog').close()});
$('#collectClue').addEventListener('click',()=>{
  if(!currentPlace||found.has(currentPlace))return; found.add(currentPlace);save();
  $('#collectClue').textContent='PISTA REGISTRADA ✓';$('#collectClue').disabled=true;
  showToast(found.size===3?'FREQUÊNCIA ALTERADA — UMA PASSAGEM RESPONDEU':`PISTA ${found.size}/6 REGISTRADA`);
  if(found.size===3) burstSignal();
});

function pointerReality(e){
  const r=hero.getBoundingClientRect(); const x=((e.clientX-r.left)/r.width)*100; const y=((e.clientY-r.top)/r.height)*100;
  root.style.setProperty('--mx',`${Math.max(0,Math.min(100,x))}%`);root.style.setProperty('--my',`${Math.max(0,Math.min(100,y))}%`);
  if(!fullReality) root.style.setProperty('--reveal',e.buttons?'26rem':'11rem');
}
hero.addEventListener('pointermove',pointerReality);hero.addEventListener('pointerdown',e=>{pointerReality(e);if(!fullReality)root.style.setProperty('--reveal','32rem')});hero.addEventListener('pointerup',()=>{if(!fullReality)root.style.setProperty('--reveal','11rem')});
function toggleReality(force){fullReality=typeof force==='boolean'?force:!fullReality;hero.classList.toggle('reality-open',fullReality);body.classList.toggle('in-upside',fullReality);$('#tearReality').textContent=fullReality?'VOLTAR PARA HAWKINS':'RASGAR A REALIDADE';if(audioEnabled) glitch();}
$('#tearReality').addEventListener('click',()=>toggleReality());
$('#crossGate').addEventListener('click',()=>{toggleReality(true);hero.scrollIntoView({behavior:'smooth'});showToast('VOCÊ ATRAVESSOU. OS ARQUIVOS MUDARAM.')});
$('#resetCase').addEventListener('click',()=>{found.clear();save();toggleReality(false);showToast('INVESTIGAÇÃO REINICIADA')});

function startExperience(withAudio){body.classList.remove('gate-open');gate.classList.add('hidden');if(withAudio)startAudio();setTimeout(()=>gate.remove(),900)}
$('#enterExperience').addEventListener('click',()=>startExperience(true));$('#enterSilent').addEventListener('click',()=>startExperience(false));body.classList.add('gate-open');

function startAudio(){
  if(audioEnabled)return;audioEnabled=true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC();audio={ctx,nodes:[]};
  const master=ctx.createGain();master.gain.value=.035;master.connect(ctx.destination);
  [43.65,65.41].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i?'sine':'triangle';o.frequency.value=f;g.gain.value=i?.28:.18;o.connect(g).connect(master);o.start();audio.nodes.push(o)});
  const buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.12;const n=ctx.createBufferSource(),ng=ctx.createGain(),filter=ctx.createBiquadFilter();n.buffer=buf;n.loop=true;filter.type='bandpass';filter.frequency.value=950;ng.gain.value=.12;n.connect(filter).connect(ng).connect(master);n.start();audio.master=master;audio.noise=ng;audio.nodes.push(n);$('#soundToggle').classList.add('on');
}
function stopAudio(){if(!audio)return;audio.ctx.close();audio=null;audioEnabled=false;$('#soundToggle').classList.remove('on')}
$('#soundToggle').addEventListener('click',()=>audioEnabled?stopAudio():startAudio());
function glitch(){if(!audio)return;const {ctx,master}=audio;master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(master.gain.value,ctx.currentTime);master.gain.linearRampToValueAtTime(.12,ctx.currentTime+.08);master.gain.linearRampToValueAtTime(.035,ctx.currentTime+.65)}
function burstSignal(){glitch();document.documentElement.animate([{filter:'none'},{filter:'contrast(1.7) hue-rotate(8deg)'},{filter:'none'}],{duration:700})}

const topbar=$('#topbar');addEventListener('scroll',()=>topbar.classList.toggle('scrolled',scrollY>30),{passive:true});
$('#menuButton').addEventListener('click',()=>{$('#mobileNav').classList.toggle('open');$('#mobileNav').setAttribute('aria-hidden',!$('#mobileNav').classList.contains('open'))});$$('#mobileNav a').forEach(a=>a.addEventListener('click',()=>$('#mobileNav').classList.remove('open')));

if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  addEventListener('scroll',()=>{const y=scrollY;document.querySelector('.hero-normal').style.transform=`scale(1.045) translateY(${Math.min(24,y*.025)}px)`;document.querySelector('.hero-upside').style.transform=`scale(1.055) translateY(${Math.min(18,y*.018)}px)`},{passive:true});
}

const canvas=$('#spores'),ctx=canvas.getContext('2d');let spores=[];
function resize(){const d=Math.min(devicePixelRatio,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);const count=Math.min(90,Math.round(innerWidth/18));spores=Array.from({length:count},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.6+.2,v:Math.random()*.25+.08,dx:(Math.random()-.5)*.12,a:Math.random()*.45+.1}))}
function animate(){ctx.clearRect(0,0,innerWidth,innerHeight);ctx.fillStyle='#d7d9cf';for(const s of spores){s.y-=s.v*(body.classList.contains('in-upside')?1.8:1);s.x+=s.dx;if(s.y<-5){s.y=innerHeight+5;s.x=Math.random()*innerWidth}ctx.globalAlpha=s.a;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}requestAnimationFrame(animate)}
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){resize();animate();addEventListener('resize',resize)}

renderProgress();