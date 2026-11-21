/* Constitutional Detective Laboratory. Four tactile ways to recover authentic case evidence. */
let trial=null, play={};

/* Six investigations, four distinct evidence-recovery scenarios in each. */
const MINI_SCENES=[
 {location:'ПАРЛАМЕНТСКОЕ ХРАНИЛИЩЕ',icon:'🏛️',stamp:'ГОСДУМА',puzzleHeading:'ЗАКОНОДАТЕЛЬНОЕ ДОСЬЕ',puzzle:'Разорванный лист из истории законопроекта: совместите края, даты заседаний и части штампа делопроизводства.',archive:'В архиве прохождения законов смешались проекты, регистрационные карточки и подписанные редакции.',loupe:'Сравните поступившие редакции: подмена даты или статуса способна изменить юридический смысл документа.',board:'Восстановите историю законодательного решения по четырём обрывкам записи.',shelves:'▥　▤　▥　▦<br>▤　▥　▦　▥<br>▥　▦　▤　▥'},
 {location:'ДИСПЕТЧЕРСКАЯ ЭНЕРГОСИСТЕМЫ',icon:'⚡',stamp:'ДИСПЕТЧЕР',puzzleHeading:'ЖУРНАЛ АВАРИЙНОГО ШТАБА',puzzle:'Восстановите повреждённую страницу журнала аварии: сопоставьте линии, отметки времени и части схемы.',archive:'На тёмных стеллажах диспетчерской перепутаны оперативные записи, распоряжения и акты сетевой организации.',loupe:'Изучите две версии диспетчерской записи: одна неточность может поменять распределение полномочий.',board:'По четырём частям оперативной сводки восстановите последовательность событий аварии.',shelves:'▦　⚡　▥　⌁<br>▤　▥　⚡　▦<br>⌁　▤　▥　⚡'},
 {location:'СЛУЖЕБНЫЙ КАДРОВЫЙ АРХИВ',icon:'🗂️',stamp:'КАДРОВАЯ',puzzleHeading:'ЛИЧНОЕ ДЕЛО: ПРОВЕРКА',puzzle:'Повреждена копия служебной записи. Восстановите лист по контуру, тексту и отметкам кадровой службы.',archive:'В тёмном кабинете перемешаны кадровые уведомления, журналы доступа и неподтверждённые служебные копии.',loupe:'В двух копиях кадровой записи ищите изменения в содержании публикаций, статусе распоряжений и персональных данных.',board:'Соедините четыре фрагмента, чтобы восстановить историю публикаций и кадрового решения.',shelves:'▤　▤　▥　▣<br>▥　▣　▤　▥<br>▣　▥　▤　▥'},
 {location:'СИТУАЦИОННЫЙ ЦЕНТР МИНИСТЕРСТВА',icon:'📑',stamp:'МИНИСТЕР',puzzleHeading:'ВЕДОМСТВЕННОЕ ДЕЛО',puzzle:'На столе остались обрывки редакции распоряжения. Восстановите страницу со штампом и связным текстом.',archive:'Ведомственный архив содержит проекты, подписанные экземпляры и служебные письма разных статусов.',loupe:'Проверьте, совпадают ли текст проекта приказа и окончательной редакции; существенны и форма, и содержание.',board:'Установите по четырём записям, как изменялась редакция ведомственного документа.',shelves:'▦　▤　▦　▤<br>▥　▥　▤　▦<br>▣　▦　▥　▤'},
 {location:'МУНИЦИПАЛЬНЫЙ ЦЕНТР ОБРАЩЕНИЙ',icon:'🏙️',stamp:'МУНИЦИП',puzzleHeading:'МУНИЦИПАЛЬНОЕ ДЕЛО',puzzle:'Порван журнал регистрации обращений. Совместите края и восстановите сведения из официальной переписки.',archive:'В архиве заявок смешаны принятые правовые акты, проекты и письма с неподтверждёнными требованиями.',loupe:'В документах центра ищите изменения в распределении полномочий и статусе муниципальных решений.',board:'Свяжите четыре части цепочки перенаправления заявок и решений органов власти.',shelves:'▤　⌂　▤　▣<br>▥　▦　⌂　▤<br>⌂　▣　▥　▦'},
 {location:'АРХИВ КРАЕВОГО СУДА',icon:'⚖️',stamp:'СУД',puzzleHeading:'МАТЕРИАЛЫ СУДЕБНОГО ДЕЛА',puzzle:'Порвана заверенная страница судебного дела. Соедините линии разрыва, даты и части судебного штампа.',archive:'В судебном хранилище перепутаны проекты документов, судебные решения и заверенные листы разных производств.',loupe:'Сравните две копии судебного документа: дата вступления решения в силу и предмет признания недействующим имеют значение.',board:'Восстановите из четырёх фрагментов последовательность судебного рассмотрения и исполнения решения.',shelves:'▦　⚖　▤　▥<br>▥　▦　⚖　▤<br>▤　▥　▣　⚖'}
];
function miniScene(){return MINI_SCENES[Math.max(0,Math.min(5,Number(trial?.caseIndex)||0))];}

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
const MINI_PAPER_W=300,MINI_PAPER_H=240,MINI_PAPER_PAD=36;
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
 ctx.fillText(miniScene().puzzleHeading,450,89);
 ctx.font='18px Georgia, serif';ctx.fillText(String(label||'Письменное доказательство').slice(0,80),450,120);
 ctx.textAlign='left';ctx.font='32px Georgia, serif';ctx.fillStyle='#3c3830';
 const words=String(content||'').trim().split(/\s+/);
 let line='',y=195;
 for(const word of words){
  const next=line?line+' '+word:word;
  if(ctx.measureText(next).width>757&&line){
   ctx.fillText(line,71,y);y+=53;line=word;
  }else line=next;
 }
 if(line)ctx.fillText(line,71,y);
 ctx.save();ctx.translate(676,555);ctx.rotate(-.18);
 ctx.globalAlpha=.36;ctx.strokeStyle='#46616b';ctx.lineWidth=5;
 ctx.beginPath();ctx.arc(0,0,93,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,78,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#46616b';ctx.textAlign='center';ctx.font='bold 25px Georgia, serif';
 ctx.fillText(miniScene().stamp,0,-6);ctx.font='17px Georgia, serif';ctx.fillText('КОПИЯ',0,23);
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
 '<rect x="-36" y="-36" width="372" height="312" fill="#fbefd2"/><text x="15" y="120" font-family="Georgia" font-size="16" fill="#463e34">'+esc(play.pieces[piece])+'</text>';
 return '<svg class="mini-paper-svg" style="--paper-turn:'+(play.rotations?.[piece]||0)+'deg" viewBox="-36 -36 372 312" preserveAspectRatio="none" aria-hidden="true">'+
 '<defs><clipPath id="'+clip+'" clipPathUnits="userSpaceOnUse"><path d="'+path+'"/></clipPath></defs>'+
 '<g clip-path="url(#'+clip+')">'+image+'</g>'+
 '<path d="'+path+'" fill="none" stroke="#9a7e59" stroke-opacity=".7" stroke-width="1.6" stroke-linejoin="round"/>'+
 '</svg>';
}

const miniOrdered=a=>a.every((v,i)=>v===i);
function miniReset(){
 play={pieces:miniSplit(trial.evidenceText,9),segments:miniSplit(trial.evidenceText,trial.kind==='board'?4:3),order:miniShuffle(9),rotations:Array.from({length:9},()=>90*Math.floor(Math.random()*4)),solved:false,zoom:false,paperImage:trial.kind==='shreds'?miniPaperImage(trial.label,trial.evidenceText):null,selected:null,found:[],inspected:[],marked:[],threads:[],lastProof:null,scanTarget:null,scanTimer:null};
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
function miniSolved(){return miniOrdered(play.order)&&play.rotations.every(n=>n===0);}
function miniFinalize(){
 if(play.solved||!miniSolved())return;
 play.solved=true;
 miniDrawScraps();
 miniHint('Разорванный лист восстановлен: все девять фрагментов расположены и повёрнуты правильно!');
 setTimeout(()=>miniWin({order:play.order.slice()}),1000);
}
function miniSwap(a,b){
 if(a===b)return;
 [play.order[a],play.order[b]]=[play.order[b],play.order[a]];
 play.selected=null;miniDrawScraps();miniFinalize();
}
function miniRotatePiece(slot){
 if(play.solved)return;
 const piece=play.order[slot];
 play.rotations[piece]=(play.rotations[piece]+90)%360;
 play.selected=slot;
 miniDrawScraps();miniFinalize();
}
function miniRotateSelected(){
 if(play.selected===null){miniHint('Сначала выберите фрагмент для поворота.');return;}
 miniRotatePiece(play.selected);
}
function miniChooseScrap(n){
 if(play.solved)return;
 if(play.selected===null){play.selected=n;miniDrawScraps();miniHint('Фрагмент выбран. Нажмите его ещё раз для поворота или другой для обмена.');return;}
 const first=play.selected;
 if(first===n){miniRotatePiece(n);miniHint('Обрывок повёрнут на 90°. Повторите касание для следующего поворота.');}
 else miniSwap(first,n);
}
function miniToggleZoom(){
 play.zoom=!play.zoom;
 const zone=document.getElementById('miniScraps');
 const button=document.getElementById('miniZoomButton');
 if(zone)zone.classList.toggle('mini-zoom',play.zoom);
 if(button)button.textContent=play.zoom?'Уменьшить лист':'Увеличить фрагменты';
}
function miniDrawScraps(){
 const root=document.getElementById('miniScraps');if(!root||!trial)return;
 root.classList.toggle('mini-assembled',miniSolved());
 root.classList.toggle('mini-zoom',!!play.zoom);
 root.innerHTML=play.order.map((piece,slot)=>'<button type="button" class="mini-scrap '+(slot===play.selected?'mini-picked':'')+'" data-slot="'+slot+'" onclick="miniChooseScrap('+slot+')" aria-pressed="'+(slot===play.selected)+'" aria-label="Фрагмент '+(slot+1)+'. Выбрать; повторное нажатие — поворот на 90 градусов." title="Нажмите для выбора · повторно — повернуть ↻">'+miniPaperFragment(piece)+'<span class="mini-turn-symbol" aria-hidden="true">↻</span></button>').join('');
 const status=document.getElementById('miniCorrect');
 if(status)status.textContent=miniSolved()?'Лист восстановлен: порядок и поворот правильные.':(play.selected===null?'Найдите места девяти фрагментам и исправьте их ориентацию. Нажмите для выбора.':'Выбран фрагмент № '+(play.selected+1)+'. Повторное нажатие — поворот на 90°, другой фрагмент — обмен.');
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

const MINI_ARCHIVE_POINTS=Array.from({length:12},(_,i)=>[14+(i%4)*24,18+Math.floor(i/4)*31]);
const MINI_LOUPE_POINTS=Array.from({length:8},(_,i)=>[50,6.25+i*12.5]);
function miniBeam(ev){
 const zone=ev.currentTarget,rect=zone.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 const px=Math.max(0,Math.min(100,100*(ev.clientX-rect.left)/rect.width));
 const py=Math.max(0,Math.min(100,100*(ev.clientY-rect.top)/rect.height));
 zone.style.setProperty('--bx',px+'%');zone.style.setProperty('--by',py+'%');
 if(!trial||!['flashlight','loupe'].includes(trial.kind))return;
 const archive=trial.kind==='flashlight';
 const pts=archive?MINI_ARCHIVE_POINTS:MINI_LOUPE_POINTS;
 const target=pts.findIndex((p,i)=>!play.inspected.includes(i)&&(
  archive?Math.hypot((px-p[0])*rect.width/100,(py-p[1])*rect.height/100)<30:
  Math.abs((py-p[1])*rect.height/100)<Math.min(31,rect.height*.052)&&px>=8&&px<=92
 ));
 if(target===play.scanTarget)return;
 clearTimeout(play.scanTimer);
 play.scanTarget=target;
 if(target>=0)play.scanTimer=setTimeout(()=>{
  if(trial&&play.scanTarget===target&&!play.inspected.includes(target)){
   miniInspect(target);
   play.scanTarget=null;
  }
 },470);
}
function miniEndScan(ev){
 if(ev.pointerType==='touch'||ev.type==='pointerleave'||ev.type==='pointercancel'){
  clearTimeout(play.scanTimer);
  play.scanTimer=null;play.scanTarget=null;
 }
}
function miniInspect(n){
 if(!trial||play.inspected.includes(n))return;
 play.inspected.push(n);clearTimeout(play.scanTimer);
 const el=document.querySelector('[data-finder="'+n+'"]');if(el)el.classList.add('found');
 miniDrawInspected();
 miniHint('Изучено '+play.inspected.length+' объектов. Отберите три доказательства, которые отвечают условиям ориентировки.');
}
function miniToggleMark(n){
 if(!play.inspected.includes(n))return;
 if(play.marked.includes(n))play.marked=play.marked.filter(x=>x!==n);
 else if(play.marked.length<3)play.marked.push(n);
 else{miniHint('Можно отметить только три документа. Сначала исключите один из выбранных.');return;}
 miniDrawInspected();
}
function miniDrawInspected(){
 const e=document.getElementById('miniFound');if(!e||!trial)return;
 const archive=trial.kind==='flashlight';
 const entries=archive?trial.archive?.files:trial.comparison?.pairs;
 e.innerHTML=play.inspected.map(i=>{
  const item=entries?.[i];if(!item)return '';
  const isMarked=play.marked.includes(i);
  const body=archive?
   '<div class="mini-folio-metadata"><b>Шифр:</b> '+esc(item.code)+'<br><b>Год:</b> '+esc(item.year)+'<br><b>Статус:</b> '+esc(item.status)+'<br><b>Лист описи:</b> '+esc(item.part)+'</div><p>'+esc(item.text)+'</p>':
   '<div class="mini-side-by-side"><div><small>ИСХОДНАЯ ЗАПИСЬ</small><p>'+esc(item.left)+'</p></div><div><small>ПРОВЕРЯЕМАЯ КОПИЯ</small><p>'+esc(item.right)+'</p></div></div>';
  return '<article class="mini-note '+(isMarked?'mini-note-selected':'')+'"><div class="filetag">ОСМОТРЕН '+(archive?'АРХИВНЫЙ ЛИСТ':'УЧАСТОК КОПИИ')+' '+String(i+1).padStart(2,'0')+'</div>'+body+'<button type="button" class="'+(isMarked?'light':'')+' slim" onclick="miniToggleMark('+i+')">'+(isMarked?'Снять отметку':archive?'Приобщить к делу':'Отметить расхождение')+'</button></article>';
 }).join('');
 const stat=document.getElementById('miniMarkStatus');
 if(stat)stat.textContent='Исследовано '+play.inspected.length+' из '+entries.length+'. Отобрано '+play.marked.length+' из 3.';
 const button=document.getElementById('miniCheck');
 if(button)button.disabled=play.marked.length!==3;
}
function miniCheckFinds(){
 if(play.marked.length!==3){miniHint('Выберите ровно три доказательства.');return;}
 miniHint('Сопоставляем отмеченные документы с описью расследования…');
 miniWin({found:play.marked.slice()});
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

function miniArchiveView(){
 const a=trial.archive||{code:'—',files:[]},scene=miniScene();
 const folders=a.files.map((item,i)=>'<span class="mini-hotspot mini-folder" data-finder="'+i+'" style="left:'+MINI_ARCHIVE_POINTS[i][0]+'%;top:'+MINI_ARCHIVE_POINTS[i][1]+'%" aria-hidden="true">▣</span>').join('');
 return '<p class="mini-instruction">'+esc(scene.archive)+' В хранилище двенадцать папок, но только три относятся к делу. Водите лучом по корешкам и задерживайтесь на каждой находке, чтобы прочитать реквизиты. Затем приобщите правильные листы к делу.</p>'+
 '<div class="mini-orientation"><b>Архивная ориентировка:</b> найдите подлинные листы № 1, 2 и 3 с шифром <b>'+esc(a.code)+'</b> за <b>2026 год</b>. Черновики, незаверенные копии и другие шифры не подходят.</div>'+
 '<div class="mini-scene mini-dark mini-archive-lg" onpointermove="miniBeam(event)" onpointerdown="miniBeam(event)" onpointerup="miniEndScan(event)" onpointercancel="miniEndScan(event)" onpointerleave="miniEndScan(event)"><div class="mini-cabinets">'+scene.shelves+'</div>'+folders+'<div class="mini-darkness"></div></div>'+
 '<div class="mini-mark-status" id="miniMarkStatus">Исследовано 0 из 12. Отобрано 0 из 3.</div><div id="miniFound" class="mini-notes"></div>'+
 '<button id="miniCheck" class="mini-check" type="button" onclick="miniCheckFinds()" disabled>Сверить три найденные папки с описью</button>';
}
function miniLoupeView(){
 const rows=trial.comparison?.pairs||[],scene=miniScene();
 const cells=rows.map((a,i)=>'<div class="mini-diff-row" data-finder="'+i+'"><div><b>Оригинал · '+String(i+1).padStart(2,'0')+'</b><p>'+esc(a.left)+'</p></div><div><b>Подозрительная копия</b><p>'+esc(a.right)+'</p></div></div>').join('');
 return '<p class="mini-instruction">'+esc(scene.loupe)+' На столе две почти одинаковые копии одного документа. Из восьми фрагментов текста три содержат юридически важные изменения. Изучите каждый участок через лупу, сопоставьте тексты и отметьте только подмены сведений.</p>'+
 '<div class="mini-orientation"><b>Задача эксперта:</b> обнаружить ровно три содержательных расхождения. Простое совпадение текста не считается подделкой.</div>'+
 '<div class="mini-scene mini-forensic mini-forensic-lg" onpointermove="miniBeam(event)" onpointerdown="miniBeam(event)" onpointerup="miniEndScan(event)" onpointercancel="miniEndScan(event)" onpointerleave="miniEndScan(event)"><div class="mini-diff-rows">'+cells+'</div><div class="mini-fog"></div><div class="mini-lens"></div></div>'+
 '<div class="mini-mark-status" id="miniMarkStatus">Изучено 0 из 8. Отмечено 0 из 3.</div><div id="miniFound" class="mini-notes"></div>'+
 '<button id="miniCheck" class="mini-check" type="button" onclick="miniCheckFinds()" disabled>Проверить три подозрительных изменения</button>';
}

function miniView(){
 if(!trial)return '';
 let stage='',k=trial.kind;
 if(k==='shreds'){
  stage='<p class="mini-instruction">'+esc(miniScene().puzzle)+' Перед вами девять фрагментов повреждённой страницы. Некоторые повёрнуты. Сопоставьте линии разрыва, текст и штамп. <b>Первое нажатие выбирает фрагмент; повторное поворачивает его на 90°.</b> Нажатие на другой обрывок меняет их местами. Также можно перетаскивать детали.</p><div class="mini-correct" id="miniCorrect"></div><div class="mini-puzzle-scroll"><div class="mini-scraps" id="miniScraps"></div></div><div class="mini-puzzle-actions"><button id="miniRotateButton" class="light slim" onclick="miniRotateSelected()">↻ Повернуть на 90°</button><button id="miniZoomButton" class="light slim" onclick="miniToggleZoom()">Увеличить фрагменты</button></div>';
 }else if(k==='flashlight'){
  stage=miniArchiveView();
 }else if(k==='loupe'){
  stage=miniLoupeView();
 }else if(k==='board'){
  stage='<p class="mini-instruction">'+esc(miniScene().board)+' На следственной доске найдены четыре фрагмента документа. Соедините их <b>красной нитью</b>, нажимая карточки в последовательности, в которой складывается смысл документа.</p><div class="mini-board">'+[2,0,3,1].map(j=>'<button class="mini-board-card" data-thread="'+j+'" onclick="miniConnect('+j+')"><i></i><p>'+esc(play.segments[j])+'</p></button>').join('')+'</div><div class="mini-threadline" id="miniThread"></div><button class="light slim" onclick="miniResetBoard()">Перепроверить связи</button>';
 }
 return '<section id="trialOverlay" class="panel mini-shell mini-case-'+Math.max(0,Math.min(5,Number(trial.caseIndex)||0))+'" role="dialog" aria-label="Следственное испытание"><div class="row"><span class="eyebrow">СЛЕДСТВЕННАЯ ОПЕРАЦИЯ · '+esc(MINI_KINDS[k])+'</span><button class="light slim" onclick="cancelChallenge()">Отменить испытание</button></div><div class="mini-location"><span>'+miniScene().icon+'</span><b>'+esc(miniScene().location)+'</b></div><h2>'+esc(trial.label)+'</h2><div class="noticebar">Вы получаете важные сведения непосредственно во время исследования. После успешного завершения документ сохраняется в общем досье команды.</div>'+stage+'<div id="miniHint" class="mini-hint" role="status">Исследуйте доказательство. Жетон пока не списан.</div><button id="miniRetry" class="light slim" hidden onclick="miniWin(play.lastProof)">Повторить проверку</button></section>';
}
function miniMount(){if(trial?.kind==='shreds'){miniDrawScraps();miniEnableDrag();}}
