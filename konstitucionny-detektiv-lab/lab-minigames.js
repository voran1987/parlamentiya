/* Constitutional Detective Laboratory. Four tactile ways to recover authentic case evidence. */
let trial=null, play={};
const MINI_KINDS={shreds:'Восстановление документа',flashlight:'Поиск в тёмном архиве',loupe:'Исследование под лупой',board:'Доска расследования'};
function miniSplit(text,n){
 const w=String(text||'').trim().split(/\s+/);
 const parts=Array.from({length:n},()=>[]);
 for(let i=0;i<w.length;i++)parts[Math.min(n-1,Math.floor(i*n/w.length))].push(w[i]);
 return parts.map(p=>p.join(' ')||'…');
}
function miniShuffle(n){
 const a=Array.from({length:n},(_,i)=>i);
 for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 if(a.every((v,i)=>v===i))[a[0],a[1]]=[a[1],a[0]];
 return a;
}
const miniOrdered=a=>a.every((v,i)=>v===i);
function miniReset(){
 play={pieces:miniSplit(trial.evidenceText,9),segments:miniSplit(trial.evidenceText,trial.kind==='board'?4:3),order:miniShuffle(9),selected:null,found:[],threads:[]};
}
async function beginChallenge(id){
 if(working)return;
 working=true;
 try{
  const resp=await request('challenge',{id});
  state=resp.state;trial=resp.challenge;miniReset();error='';render();
  document.getElementById('trialOverlay')?.scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){message(e.message)}finally{working=false}
}
async function cancelChallenge(){
 if(!trial||!confirm('Отменить это испытание? Потраченных жетонов нет, но прогресс мини-игры сбросится.'))return;
 working=true;try{const r=await request('cancelChallenge');state=r.state;trial=null;play={};error='';render()}
 catch(e){message(e.message)}finally{working=false}
}
function miniHint(t){const e=document.getElementById('miniHint');if(e)e.textContent=t}
async function miniWin(proof){
 if(!trial||working)return;
 working=true;
 try{
  const r=await request('solveChallenge',{id:trial.id,nonce:trial.nonce,proof});
  state=r.state;trial=null;play={};error='';render();
  alert('Документ добыт! Списан один жетон. Полная улика теперь открыта всем участникам команды.');
 }catch(e){miniHint(e.message)}finally{working=false}
}
function miniSwap(a,b){
 if(a===b)return;
 [play.order[a],play.order[b]]=[play.order[b],play.order[a]];
 miniDrawScraps();
 if(miniOrdered(play.order)){
  miniHint('Все фрагменты на месте. Восстановленный текст найден!');
  setTimeout(()=>miniWin({order:play.order.slice()}),500);
 }
}
function miniChooseScrap(n){
 if(play.selected===null){play.selected=n;miniDrawScraps();return}
 let first=play.selected;play.selected=null;miniSwap(first,n);miniDrawScraps();
}
function miniDrawScraps(){
 const root=document.getElementById('miniScraps');if(!root||!trial)return;
 root.innerHTML=play.order.map((piece,slot)=>'<button class="mini-scrap '+(slot===play.selected?'mini-picked':'')+'" data-slot="'+slot+'" onclick="miniChooseScrap('+slot+')"><small>ОБРЫВОК '+(piece+1)+'</small><span>'+esc(play.pieces[piece])+'</span></button>').join('');
 const status=document.getElementById('miniCorrect');
 if(status)status.textContent=play.order.filter((v,i)=>v===i).length+' из 9 фрагментов расположены правильно';
}
function miniEnableDrag(){
 const zone=document.getElementById('miniScraps');if(!zone)return;
 let start=null;
 zone.addEventListener('pointerdown',ev=>{
  let item=ev.target.closest('[data-slot]');if(item)start={slot:+item.dataset.slot,x:ev.clientX,y:ev.clientY};
 });
 zone.addEventListener('pointerup',ev=>{
  if(!start)return;
  const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-slot]');
  if(target&&zone.contains(target)&&Math.hypot(ev.clientX-start.x,ev.clientY-start.y)>12){
   ev.preventDefault();ev.stopPropagation();play.selected=null;miniSwap(start.slot,+target.dataset.slot)
  }
  start=null;
 });
}
function miniBeam(ev){
 const zone=ev.currentTarget,r=zone.getBoundingClientRect();
 zone.style.setProperty('--bx',Math.max(0,Math.min(100,100*(ev.clientX-r.left)/r.width))+'%');
 zone.style.setProperty('--by',Math.max(0,Math.min(100,100*(ev.clientY-r.top)/r.height))+'%');
}
function miniFind(n){
 if(play.found.includes(n))return;
 play.found.push(n);
 const note=document.querySelector('[data-finder="'+n+'"]');if(note)note.classList.add('found');
 let shelf=document.getElementById('miniFound');
 if(shelf)shelf.innerHTML=play.found.map(i=>'<div class="mini-note"><div class="filetag">ОБНАРУЖЕННЫЙ ФРАГМЕНТ '+(i+1)+'</div><p>'+esc(play.segments[i])+'</p></div>').join('');
 miniHint('Найдено '+play.found.length+' из 3 фрагментов. '+(play.found.length===3?'Документ восстановлен.':'Продолжайте поиск.'));
 if(play.found.length===3)setTimeout(()=>miniWin({found:play.found.slice()}),520);
}
function miniConnect(n){
 if(play.threads.includes(n))return;
 play.threads.push(n);
 let card=document.querySelector('[data-thread="'+n+'"]');if(card)card.classList.add('found');
 const sequence=document.getElementById('miniThread');
 if(sequence)sequence.innerHTML=play.threads.map((id,i)=>'<div class="mini-thread"><b>СВЯЗЬ '+(i+1)+'</b><p>'+esc(play.segments[id])+'</p></div>').join('');
 if(play.threads.length===4){
  if(miniOrdered(play.threads)){miniHint('Правильная цепочка событий восстановлена!');setTimeout(()=>miniWin({order:play.threads.slice()}),520)}
  else miniHint('Нити перепутаны. Сравните фрагменты и попробуйте другой порядок.');
 }
}
function miniResetBoard(){
 play.threads=[];const zone=document.getElementById('miniThread');if(zone)zone.innerHTML='';
 document.querySelectorAll('[data-thread]').forEach(x=>x.classList.remove('found'));
 miniHint('Изучите четыре фрагмента одного документа и соедините их в правильной последовательности.');
}
function miniView(){
 if(!trial)return '';
 let stage='',k=trial.kind;
 if(k==='shreds'){
  stage='<p class="mini-instruction">Перед вами девять разорванных клочков подлинного игрового документа. <b>В каждом видны слова, даты и факты.</b> Поставьте их в правильном порядке. Можно перетаскивать или нажимать последовательно на два клочка.</p><div class="mini-correct" id="miniCorrect"></div><div class="mini-scraps" id="miniScraps"></div>';
 }else if(k==='flashlight'){
  const at=[[19,22],[79,45],[46,79]];
  stage='<p class="mini-instruction">Архив погружён во тьму. Ведите пальцем по комнате — фонарик покажет детали. Найдите три папки и нажмите на них: <b>внутри фрагменты самого доказательства</b>.</p><div class="mini-scene mini-dark" onpointermove="miniBeam(event)" onpointerdown="miniBeam(event)"><div class="mini-cabinets">▥　▤　▥　▦<br>▤　▥　▦　▤<br>▦　▤　▥　▥</div>'+at.map((p,i)=>'<button class="mini-hotspot" data-finder="'+i+'" style="left:'+p[0]+'%;top:'+p[1]+'%" onclick="miniFind('+i+')" aria-label="Скрытая папка">▤</button>').join('')+'<div class="mini-darkness"></div></div><div id="miniFound" class="mini-notes"></div>';
 }else if(k==='loupe'){
  const at=[[21,23],[76,50],[39,81]];
  stage='<p class="mini-instruction">Копия документа выцвела. Двигайте лупу по бумаге и нажмите на три отметки. Каждая восстановит <b>часть реального текста документа</b>.</p><div class="mini-scene mini-forensic" onpointermove="miniBeam(event)" onpointerdown="miniBeam(event)"><div class="mini-page"><div class="filetag">ЭКСПЕРТНАЯ КОПИЯ · ПРОВЕРКА ДЕТАЛЕЙ</div><p>'+esc(trial.evidenceText)+'</p><p>'+esc(trial.evidenceText)+'</p></div>'+at.map((p,i)=>'<button class="mini-hotspot mini-stamp" data-finder="'+i+'" style="left:'+p[0]+'%;top:'+p[1]+'%" onclick="miniFind('+i+')" aria-label="Контрольная отметка">⌖</button>').join('')+'<div class="mini-fog"></div><div class="mini-lens"></div></div><div id="miniFound" class="mini-notes"></div>';
 }else if(k==='board'){
  stage='<p class="mini-instruction">На следственной доске найдены четыре фрагмента документа. Соедините их <b>красной нитью</b>, нажимая карточки в последовательности, в которой складывается смысл документа.</p><div class="mini-board">'+[2,0,3,1].map(j=>'<button class="mini-board-card" data-thread="'+j+'" onclick="miniConnect('+j+')"><i></i><p>'+esc(play.segments[j])+'</p></button>').join('')+'</div><div class="mini-threadline" id="miniThread"></div><button class="light slim" onclick="miniResetBoard()">Перепроверить связи</button>';
 }
 return '<section id="trialOverlay" class="panel mini-shell" role="dialog" aria-label="Следственное испытание"><div class="row"><span class="eyebrow">СЛЕДСТВЕННАЯ ОПЕРАЦИЯ · '+esc(MINI_KINDS[k])+'</span><button class="light slim" onclick="cancelChallenge()">Отменить испытание</button></div><h2>'+esc(trial.label)+'</h2><div class="noticebar">Вы получаете важные сведения непосредственно во время исследования. После успешного завершения документ сохраняется в общем досье команды.</div>'+stage+'<div id="miniHint" class="mini-hint" role="status">Исследуйте доказательство. Жетон пока не списан.</div></section>';
}
function miniMount(){if(trial?.kind==='shreds'){miniDrawScraps();miniEnableDrag();}}
