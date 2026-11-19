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

/* One scanned archive sheet, broken into nine complementary, irregular pieces.
   Two neighbours use the SAME generated seam, so their torn edges fit exactly. */
const MINI_PAPER_W=300,MINI_PAPER_H=240,MINI_PAPER_PAD=24;
function miniSeamOffset(axis,seam,segment,n){
 if(seam===0||seam===3||n===0||n===20)return 0;
 const t=n/20,seed=segment*37+seam*71+(axis==='h'?13:29);
 const large=13*Math.sin(n*2.79+seed*.83)+11*Math.sin(n*4.83+seed*1.17);
 const small=3*Math.sin(n*13.1+seed*2.07);
 return Math.round(Math.sin(Math.PI*t)*(large+small));
}
function miniPaperPath(piece){
 const c=piece%3,r=Math.floor(piece/3),pts=[];
 for(let i=0;i<=20;i++)pts.push([i*MINI_PAPER_W/20,miniSeamOffset('h',r,c,i)]);
 for(let i=1;i<=20;i++)pts.push([MINI_PAPER_W+miniSeamOffset('v',c+1,r,i),i*MINI_PAPER_H/20]);
 for(let i=19;i>=0;i--)pts.push([i*MINI_PAPER_W/20,MINI_PAPER_H+miniSeamOffset('h',r+1,c,i)]);
 for(let i=19;i>=1;i--)pts.push([miniSeamOffset('v',c,r,i),i*MINI_PAPER_H/20]);
 return 'M '+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L ')+' Z';
}
function miniPaperImage(label,content){
 const canvas=document.createElement('canvas');
 canvas.width=900;canvas.height=720;
 const ctx=canvas.getContext('2d');
 if(!ctx)return '';
 const gradient=ctx.createLinearGradient(0,0,900,720);
 gradient.addColorStop(0,'#fff9e7');gradient.addColorStop(.56,'#f6ebd0');gradient.addColorStop(1,'#eaddb9');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,900,720);
 ctx.fillStyle='#8e74552b';
 for(let i=0;i<185;i++){
  const x=((i*137+31)%899),y=((i*89+17)%719);
  ctx.fillRect(x,y,(i%3)+1,(i%5)+1);
 }
 ctx.strokeStyle='#b49d7f';ctx.lineWidth=2;
 ctx.strokeRect(46,43,808,637);
 ctx.beginPath();ctx.moveTo(65,134);ctx.lineTo(836,134);ctx.stroke();
 ctx.fillStyle='#544632';ctx.textAlign='center';
 ctx.font='bold 29px Georgia, serif';
 ctx.fillText('АРХИВНЫЙ ДОКУМЕНТ',450,89);
 ctx.font='18px Georgia, serif';ctx.fillText(String(label||'Письменное доказательство').slice(0,80),450,120);
 ctx.textAlign='left';ctx.font='27px Georgia, serif';ctx.fillStyle='#3c3830';
 const words=String(content||'').trim().split(/\s+/);
 let line='',y=195;
 for(const word of words){
  const next=line?line+' '+word:word;
  if(ctx.measureText(next).width>757&&line){
   ctx.fillText(line,71,y);y+=49;line=word;
  }else line=next;
 }
 if(line)ctx.fillText(line,71,y);
 ctx.save();ctx.translate(676,555);ctx.rotate(-.18);
 ctx.globalAlpha=.36;ctx.strokeStyle='#46616b';ctx.lineWidth=5;
 ctx.beginPath();ctx.arc(0,0,93,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,78,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#46616b';ctx.textAlign='center';ctx.font='bold 25px Georgia, serif';
 ctx.fillText('АРХИВ',0,-6);ctx.font='17px Georgia, serif';ctx.fillText('КОПИЯ',0,23);
 ctx.restore();
 ctx.fillStyle='#76664c';ctx.textAlign='left';ctx.font='italic 18px Georgia, serif';
 ctx.fillText('Восстановление документа · материалы дела',69,654);
 return canvas.toDataURL('image/png');
}
function miniPaperFragment(piece){
 const c=piece%3,r=Math.floor(piece/3);
 const clip='mini-paper-clip-'+piece;
 const path=miniPaperPath(piece);
 const image=play.paperImage?'<image href="'+play.paperImage+'" x="'+(-c*MINI_PAPER_W)+'" y="'+(-r*MINI_PAPER_H)+'" width="900" height="720" preserveAspectRatio="none"/>':
 '<rect x="-24" y="-24" width="348" height="288" fill="#fbefd2"/><text x="15" y="120" font-family="Georgia" font-size="16" fill="#463e34">'+esc(play.pieces[piece])+'</text>';
 return '<svg class="mini-paper-svg" viewBox="-24 -24 348 288" preserveAspectRatio="none" aria-hidden="true">'+
 '<defs><clipPath id="'+clip+'" clipPathUnits="userSpaceOnUse"><path d="'+path+'"/></clipPath></defs>'+
 '<g clip-path="url(#'+clip+')">'+image+'</g>'+
 '<path d="'+path+'" fill="none" stroke="#9a7e59" stroke-opacity=".7" stroke-width="1.6" stroke-linejoin="round"/>'+
 '</svg>';
}

const miniOrdered=a=>a.every((v,i)=>v===i);
function miniReset(){
 play={pieces:miniSplit(trial.evidenceText,9),segments:miniSplit(trial.evidenceText,trial.kind==='board'?4:3),order:miniShuffle(9),paperImage:trial.kind==='shreds'?miniPaperImage(trial.label,trial.evidenceText):null,selected:null,found:[],threads:[],lastProof:null,scanTarget:null,scanTimer:null};
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
 if(!trial||!confirm('Отменить общее испытание команды? Жетон не списывается, но прогресс мини-игры на телефонах сбросится.'))return;
 working=true;try{clearTimeout(play.scanTimer);const r=await request('cancelChallenge');state=r.state;trial=null;play={};error='';render()}
 catch(e){message(e.message)}finally{working=false}
}
function miniHint(t){const e=document.getElementById('miniHint');if(e)e.textContent=t}
async function miniWin(proof){
 if(!trial||working)return;
 play.lastProof=proof;
 working=true;
 try{
  const r=await request('solveChallenge',{id:trial.id,nonce:trial.nonce,proof});
  clearTimeout(play.scanTimer);state=r.state;trial=null;play={};error='';render();
  alert(typeof DEMO_MODE!=='undefined'&&DEMO_MODE?'Демонстрация пройдена! Ниже открыт полный текст восстановленного документа.':'Документ добыт! Списан один жетон. Полная улика теперь открыта всем участникам команды.');
 }catch(e){
  let cleared=false;
  try{const r=await request('state');state=r.state;cleared=!!state.case?.items?.[trial.id]?.unlocked;}catch(_e){}
  if(cleared){clearTimeout(play.scanTimer);trial=null;play={};render();alert('Другой участник уже получил этот документ. Теперь он открыт всей команде.');}
  else {miniHint(e.message+' Нажмите «Повторить проверку», если испытание завершено.');const button=document.getElementById('miniRetry');if(button)button.hidden=false;}
 }finally{working=false}
}
function miniSwap(a,b){
 if(a===b)return;
 [play.order[a],play.order[b]]=[play.order[b],play.order[a]];
 miniDrawScraps();
 if(miniOrdered(play.order)){
  miniHint('Разорванный лист восстановлен: неровные края и фрагменты документа совпали!');
  setTimeout(()=>miniWin({order:play.order.slice()}),1100);
 }
}
function miniChooseScrap(n){
 if(play.selected===null){play.selected=n;miniDrawScraps();return}
 let first=play.selected;play.selected=null;miniSwap(first,n);miniDrawScraps();
}
function miniDrawScraps(){
 const root=document.getElementById('miniScraps');if(!root||!trial)return;
 root.classList.toggle('mini-assembled',miniOrdered(play.order));
 root.innerHTML=play.order.map((piece,slot)=>'<button type="button" class="mini-scrap '+(slot===play.selected?'mini-picked':'')+'" data-slot="'+slot+'" onclick="miniChooseScrap('+slot+')" aria-label="Фрагмент разорванной бумаги. Выбрать или поменять местами">'+miniPaperFragment(piece)+'</button>').join('');
 const status=document.getElementById('miniCorrect');
 if(status)status.textContent=miniOrdered(play.order)?'Лист восстановлен. Соседние края, строки и печать совпали.':'Сопоставляйте соседние линии разрыва, строки текста и части архивной печати.';
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
 if(!r.width||!r.height)return;
 const px=Math.max(0,Math.min(100,100*(ev.clientX-r.left)/r.width));
 const py=Math.max(0,Math.min(100,100*(ev.clientY-r.top)/r.height));
 zone.style.setProperty('--bx',px+'%');
 zone.style.setProperty('--by',py+'%');
 if(!trial||!['flashlight','loupe'].includes(trial.kind))return;
 const positions=trial.kind==='flashlight'?[[19,22],[79,45],[46,79]]:[[21,23],[76,50],[39,81]];
 let target=positions.findIndex((p,i)=>!play.found.includes(i)&&Math.hypot((px-p[0])*r.width/100,(py-p[1])*r.height/100)<42);
 if(target===play.scanTarget)return;
 clearTimeout(play.scanTimer);
 play.scanTarget=target;
 if(target>=0)play.scanTimer=setTimeout(()=>{
  if(trial&&play.scanTarget===target&&!play.found.includes(target)){
   miniFind(target);
   play.scanTarget=null;
  }
 },350);
}
function miniEndScan(ev){
 if(ev.pointerType==='touch'||ev.type==='pointerleave'||ev.type==='pointercancel'){
  clearTimeout(play.scanTimer);
  play.scanTimer=null;play.scanTarget=null;
 }
}
function miniFind(n){
 if(!trial||play.found.includes(n))return;
 clearTimeout(play.scanTimer);
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
  stage='<p class="mini-instruction">Перед вами девять фрагментов одной повреждённой страницы. <b>У каждого клочка неповторимый рваный контур: соседние края дополняют друг друга.</b> Сопоставляйте линии разрыва, продолжения строк и части архивного штампа. Перетаскивайте детали либо нажимайте на две по очереди, чтобы поменять их местами.</p><div class="mini-correct" id="miniCorrect"></div><div class="mini-scraps" id="miniScraps"></div>';
 }else if(k==='flashlight'){
  const at=[[19,22],[79,45],[46,79]];
  stage='<p class="mini-instruction">Архив погружён во тьму. Ведите пальцем по комнате — фонарик покажет детали. Найдите три папки и ненадолго задержите луч на каждой: <b>внутри фрагменты самого доказательства</b>.</p><div class="mini-scene mini-dark" onpointermove="miniBeam(event)" onpointerdown="miniBeam(event)" onpointerup="miniEndScan(event)" onpointercancel="miniEndScan(event)" onpointerleave="miniEndScan(event)"><div class="mini-cabinets">▥　▤　▥　▦<br>▤　▥　▦　▤<br>▦　▤　▥　▥</div>'+at.map((p,i)=>'<span class="mini-hotspot" data-finder="'+i+'" style="left:'+p[0]+'%;top:'+p[1]+'%" aria-hidden="true">▤</span>').join('')+'<div class="mini-darkness"></div></div><div id="miniFound" class="mini-notes"></div>';
 }else if(k==='loupe'){
  const at=[[21,23],[76,50],[39,81]];
  stage='<p class="mini-instruction">Копия документа выцвела. Перемещайте лупу по бумаге и ненадолго задержите её над тремя важными отметками. Каждая восстановит <b>часть реального текста документа</b>.</p><div class="mini-scene mini-forensic" onpointermove="miniBeam(event)" onpointerdown="miniBeam(event)" onpointerup="miniEndScan(event)" onpointercancel="miniEndScan(event)" onpointerleave="miniEndScan(event)"><div class="mini-page"><div class="filetag">ЭКСПЕРТНАЯ КОПИЯ · ПРОВЕРКА ДЕТАЛЕЙ</div><p>'+esc(trial.evidenceText)+'</p><p>'+esc(trial.evidenceText)+'</p></div>'+at.map((p,i)=>'<span class="mini-hotspot mini-stamp" data-finder="'+i+'" style="left:'+p[0]+'%;top:'+p[1]+'%" aria-hidden="true">⌖</span>').join('')+'<div class="mini-fog"></div><div class="mini-lens"></div></div><div id="miniFound" class="mini-notes"></div>';
 }else if(k==='board'){
  stage='<p class="mini-instruction">На следственной доске найдены четыре фрагмента документа. Соедините их <b>красной нитью</b>, нажимая карточки в последовательности, в которой складывается смысл документа.</p><div class="mini-board">'+[2,0,3,1].map(j=>'<button class="mini-board-card" data-thread="'+j+'" onclick="miniConnect('+j+')"><i></i><p>'+esc(play.segments[j])+'</p></button>').join('')+'</div><div class="mini-threadline" id="miniThread"></div><button class="light slim" onclick="miniResetBoard()">Перепроверить связи</button>';
 }
 return '<section id="trialOverlay" class="panel mini-shell" role="dialog" aria-label="Следственное испытание"><div class="row"><span class="eyebrow">СЛЕДСТВЕННАЯ ОПЕРАЦИЯ · '+esc(MINI_KINDS[k])+'</span><button class="light slim" onclick="cancelChallenge()">Отменить испытание</button></div><h2>'+esc(trial.label)+'</h2><div class="noticebar">Вы получаете важные сведения непосредственно во время исследования. После успешного завершения документ сохраняется в общем досье команды.</div>'+stage+'<div id="miniHint" class="mini-hint" role="status">Исследуйте доказательство. Жетон пока не списан.</div><button id="miniRetry" class="light slim" hidden onclick="miniWin(play.lastProof)">Повторить проверку</button></section>';
}
function miniMount(){if(trial?.kind==='shreds'){miniDrawScraps();miniEnableDrag();}}
