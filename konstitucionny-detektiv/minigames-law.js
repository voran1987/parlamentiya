/* Legal Detective: source-grounded civil, family and employment case minigames. */
let trial=null, play={};

/* Six investigations, four distinct evidence-recovery scenarios in each. */
const MINI_SCENES=[{"location":"НОТАРИАЛЬНЫЙ АРХИВ","icon":"📜","stamp":"НАСЛЕДСТВО","puzzleHeading":"БОЛЬНИЧНОЕ ЗАВЕЩАНИЕ","puzzle":"Восстановите часть медицинского завещания: следите за датами, лицевой и оборотной сторонами и реквизитами удостоверения.","archive":"Папки нотариуса и больницы содержат три завещания и записи об их удостоверении. Поиск должен отделять черновики от оригиналов.","loupe":"Сравните неполную копию с архивной: значение имеет наличие подписи свидетеля, а не декоративные отличия.","board":"Соотнесите даты, удостоверителей и юридическое действие всех трёх завещаний.","shelves":"▥　✒　▤　▣<br>▤　▥　✒　▤<br>▣　▤　▥　✒"},{"location":"ЮРИДИЧЕСКИЙ ОТДЕЛ КОМБИНАТА","icon":"📑","stamp":"ДОВЕРЕННОСТЬ","puzzleHeading":"ДОГОВОР И ПОЛНОМОЧИЯ","puzzle":"Соберите лист доверенности и проверьте, какие ограничения относятся к полномочиям, а какие — к внутренним распоряжениям.","archive":"В корпоративном архиве лежат доверенность, служебное задание, договор и электронная переписка с продавцом.","loupe":"Выявите разницу между отсутствием ценового предела в доверенности и внутренним требованием согласовать сумму.","board":"Установите цепочку полномочий, уведомления продавца, подписания договора и возможного одобрения.","shelves":"▦　⌑　▤　▦<br>▣　▥　▥　⌑<br>▤　▦　▣　▤"},{"location":"АРХИВ СЕМЕЙНЫХ АКТИВОВ","icon":"🏠","stamp":"СОБСТВЕННОСТЬ","puzzleHeading":"ИСТОЧНИК ДЕНЕГ","puzzle":"Восстановите фрагмент банковского документа: проверьте основание поступления и последующего платежа.","archive":"Банковские выписки, свидетельства о наследстве и договоры помогают отделить личное имущество от общего.","loupe":"Найдите именно юридически значимые отличия в датах, основаниях приобретения и движении средств.","board":"Соедините покупку дачи, продажу добрачной квартиры, поступления денег и источники финансирования.","shelves":"⌂　▦　▤　▣<br>▦　⌂　▥　▤<br>▥　▤　⌂　▦"},{"location":"КРЕДИТНОЕ ДОСЬЕ","icon":"🏦","stamp":"БАНК","puzzleHeading":"КРЕДИТНЫЙ ДОГОВОР","puzzle":"Восстановите документ о кредите: убедитесь, кто является заёмщиком и кому перечислялись денежные средства.","archive":"В банковском деле перемешаны анкеты, платёжные поручения, кредитные договоры и реестровые записи.","loupe":"Различайте отсутствие подписи созаёмщика и действительное использование денег на нужды семьи.","board":"Свяжите кредит, платёж продавцу, регистрацию квартиры и требования банка.","shelves":"▤　▣　⌂　▥<br>▦　▤　▦　⌂<br>▤　▥　▣　▤"},{"location":"КАДРОВЫЙ АРХИВ","icon":"🛠️","stamp":"ТРУДОВОЙ","puzzleHeading":"ПРИКАЗ О ПРИЁМЕ","puzzle":"Соберите кадровый документ и выясните, какие события произошли раньше — фактическая работа или решение отменить вакансию.","archive":"В архиве находятся журналы пропусков, инструктажей, служебные задания и неподписанные проекты приказов.","loupe":"Сравните копии кадровых документов; отличайте дату трудового допуска от даты позднего оформления.","board":"Восстановите последовательность: поручение руководителя, допуск, задания, исполнение и отказ в оформлении.","shelves":"▤　⚙　▥　▦<br>▣　▤　⚙　▥<br>▥　▦　▤　▣"},{"location":"ОТДЕЛ ЗАЩИТЫ ИНФОРМАЦИИ","icon":"💻","stamp":"КОНФИДЕНЦИАЛЬНО","puzzleHeading":"ПЕРЕЧЕНЬ ТАЙНЫ","puzzle":"Сопоставьте фрагменты локального положения, приказа об увольнении и объяснительной: не все упомянутые сведения являются охраняемой тайной.","archive":"Исследуйте локальные акты, переписку и доступный всем каталог компании — важна дата публикации.","loupe":"Найдите различие между внутренней ценой, закрытой скидкой и общедоступным адресом поставщика.","board":"Расположите по хронологии публикацию поставщика, ознакомление сотрудника, разговор и увольнение.","shelves":"▥　⌘　▦　▤<br>▤　▣　⌘　▥<br>▦　▤　▥　▣"}];
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
const miniHardPaper=()=>trial?.puzzle?.version===2;
const miniPaperRows=()=>miniHardPaper()?4:3;
function miniSeamOffset(axis,seam,segment,n){
 if(seam===0||(axis==='v'?seam===3:seam===miniPaperRows())||n===0||n===20)return 0;
 const t=n/20,seed=segment*37+seam*71+(axis==='h'?13:29);
 const large=13*Math.sin(n*2.79+seed*.83)+11*Math.sin(n*4.83+seed*1.17);
 const small=3*Math.sin(n*13.1+seed*2.07);
 return Math.round(Math.sin(Math.PI*t)*(large+small));
}
function miniPaperPath(piece){
 const valid=!miniHardPaper()||piece<12,c=piece%3,r=Math.floor(piece/3),pts=[];
 const offset=(axis,side,n)=>{
  if(valid){
   if(side==='top')return miniSeamOffset('h',r,c,n);
   if(side==='right')return miniSeamOffset('v',c+1,r,n);
   if(side==='bottom')return miniSeamOffset('h',r+1,c,n);
   return miniSeamOffset('v',c,r,n);
  }
  const seed=piece*13;
  if(side==='top')return miniSeamOffset('h',1,seed+1,n);
  if(side==='right')return miniSeamOffset('v',1,seed+9,n);
  if(side==='bottom')return miniSeamOffset('h',2,seed+17,n);
  return miniSeamOffset('v',2,seed+25,n);
 };
 for(let i=0;i<=20;i++)pts.push([i*MINI_PAPER_W/20,offset('h','top',i)]);
 for(let i=1;i<=20;i++)pts.push([MINI_PAPER_W+offset('v','right',i),i*MINI_PAPER_H/20]);
 for(let i=19;i>=0;i--)pts.push([i*MINI_PAPER_W/20,MINI_PAPER_H+offset('h','bottom',i)]);
 for(let i=19;i>=1;i--)pts.push([offset('v','left',i),i*MINI_PAPER_H/20]);
 return 'M '+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L ')+' Z';
}
function miniPaperImage(label,content){
 const canvas=document.createElement('canvas');
 canvas.width=900;canvas.height=miniHardPaper()?960:720;
 const ctx=canvas.getContext('2d');
 if(!ctx)return '';
 const gradient=ctx.createLinearGradient(0,0,900,canvas.height);
 gradient.addColorStop(0,'#fff9e7');gradient.addColorStop(.56,'#f6ebd0');gradient.addColorStop(1,'#eaddb9');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,900,canvas.height);
 ctx.fillStyle='#8e74552b';
 for(let i=0;i<185;i++){
  const x=((i*137+31)%899),y=((i*89+17)%(canvas.height-1));
  ctx.fillRect(x,y,(i%3)+1,(i%5)+1);
 }
 ctx.strokeStyle='#b49d7f';ctx.lineWidth=2;
 ctx.strokeRect(46,43,808,canvas.height-83);
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
 ctx.save();ctx.translate(676,miniHardPaper()?752:555);ctx.rotate(-.18);
 ctx.globalAlpha=.36;ctx.strokeStyle='#46616b';ctx.lineWidth=5;
 ctx.beginPath();ctx.arc(0,0,93,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,78,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#46616b';ctx.textAlign='center';ctx.font='bold 25px Georgia, serif';
 ctx.fillText(miniScene().stamp,0,-6);ctx.font='17px Georgia, serif';ctx.fillText('КОПИЯ',0,23);
 ctx.restore();
 ctx.fillStyle='#76664c';ctx.textAlign='left';ctx.font='italic 18px Georgia, serif';
 ctx.fillText('Восстановление документа · материалы дела',69,canvas.height-66);
 if(miniHardPaper()){
  ctx.strokeStyle='#8b775966';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(75,425);ctx.lineTo(815,620);ctx.stroke();
  ctx.fillStyle='#7a6256';ctx.font='italic 23px Georgia,serif';ctx.fillText('Для проверки юридической силы и даты решения',76,840);
  ctx.font='19px Georgia,serif';ctx.fillText('Фрагменты восстановить в едином порядке',76,881);
 }
 return canvas.toDataURL('image/png');
}
function miniFalseText(index){
 const excerpt=String(trial.evidenceText||'Документ находится в архиве');
 const words=excerpt.trim().split(/\s+/);
 const altered=words.map((w,i)=>{
  if(index===0&&i===2)return w.replace(/2026/g,'2025').replace(/\d{1,2}/,x=>String(Number(x)+1));
  if(index===1&&i===Math.floor(words.length*.42))return /закона/i.test(w)?'приказа':'редакции';
  if(index===2&&i===Math.floor(words.length*.7))return /решени/i.test(w)?'проекта':'согласования';
  return w;
 }).join(' ');
 return altered;
}
function miniDecoyPaper(index){
 const canvas=document.createElement('canvas');canvas.width=300;canvas.height=240;
 const ctx=canvas.getContext('2d');if(!ctx)return '';
 const grad=ctx.createLinearGradient(0,0,300,240);grad.addColorStop(0,'#faf1dd');grad.addColorStop(1,'#e9dcc0');
 ctx.fillStyle=grad;ctx.fillRect(0,0,300,240);
 ctx.strokeStyle='#a78d644d';ctx.lineWidth=1;ctx.strokeRect(13,11,274,212);
 ctx.fillStyle='#6e5b41';ctx.font='bold 16px Georgia,serif';
 ctx.fillText(miniScene().stamp,17,33);
 ctx.strokeStyle='#ac9680';ctx.beginPath();ctx.moveTo(12,45);ctx.lineTo(293,45);ctx.stroke();
 ctx.fillStyle='#3c382e';ctx.font='17px Georgia,serif';
 let str='',y=70;const tokens=miniFalseText(index).split(/\s+/);
 for(const token of tokens){
  const test=str?str+' '+token:token;
  if(ctx.measureText(test).width>266&&str){ctx.fillText(str,16,y);y+=30;str=token;}else str=test;
  if(y>217)break;
 }
 if(str&&y<=217)ctx.fillText(str,16,y);
 return canvas.toDataURL('image/png');
}
function miniPaperFragment(piece){
 const hard=miniHardPaper(),decoy=hard&&piece>=12,c=piece%3,r=Math.floor(piece/3);
 const clip='mini-paper-clip-'+piece;
 const path=miniPaperPath(piece);
 const image=decoy&&play.decoyImages?.[piece-12]?
  '<image href="'+play.decoyImages[piece-12]+'" x="0" y="0" width="300" height="240" preserveAspectRatio="none"/>':
  play.paperImage?'<image href="'+play.paperImage+'" x="'+(-c*MINI_PAPER_W)+'" y="'+(-r*MINI_PAPER_H)+'" width="900" height="'+(hard?960:720)+'" preserveAspectRatio="none"/>':
  '<rect x="-36" y="-36" width="372" height="312" fill="#fbefd2"/><text x="15" y="120" font-family="Georgia" font-size="16" fill="#463e34">'+esc(play.pieces[piece]||'')+'</text>';
 return '<svg class="mini-paper-svg" style="--paper-turn:'+(play.rotations?.[piece]||0)+'deg" viewBox="-36 -36 372 312" preserveAspectRatio="none" aria-hidden="true">'+
 '<defs><clipPath id="'+clip+'" clipPathUnits="userSpaceOnUse"><path d="'+path+'"/></clipPath></defs>'+
 '<g clip-path="url(#'+clip+')">'+image+'</g>'+
 '<path d="'+path+'" fill="none" stroke="#9a7e59" stroke-opacity=".7" stroke-width="1.6" stroke-linejoin="round"/>'+
 '</svg>';
}
const miniOrdered=a=>a.every((v,i)=>v===i);
function miniReset(){
 const hard=trial.kind==='shreds'&&miniHardPaper(),n=hard?15:9;
 play={pieces:miniSplit(trial.evidenceText,hard?12:9),segments:miniSplit(trial.evidenceText,trial.kind==='board'?4:3),order:miniShuffle(n),rotations:Array.from({length:n},()=>hard?90*Math.floor(Math.random()*4):0),zoom:false,paperImage:trial.kind==='shreds'?miniPaperImage(trial.label,trial.evidenceText):null,decoyImages:hard?Array.from({length:3},(_,i)=>miniDecoyPaper(i)):[],selected:null,found:[],inspected:[],marked:[],threads:[],lastProof:null,scanTarget:null,scanTimer:null,solved:false};
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
function miniSolved(){
 return miniHardPaper()?
   miniOrdered(play.order.slice(0,12))&&play.order.slice(12).slice().sort((a,b)=>a-b).join(',')==='12,13,14'&&play.rotations.slice(0,12).every(x=>x===0):
   miniOrdered(play.order);
}
function miniFinalize(){
 if(!miniSolved()||play.solved)return;
 play.solved=true;
 miniDrawScraps();
 miniHint('Все линии разрыва совпали. Документ восстановлен, три посторонних обрывка исключены.');
 const proof=miniHardPaper()?{order:play.order.slice(0,12),rotations:play.rotations.slice(0,12),extras:play.order.slice(12)}:{order:play.order.slice()};
 setTimeout(()=>miniWin(proof),950);
}
function miniSwap(a,b){
 if(a===b)return;
 [play.order[a],play.order[b]]=[play.order[b],play.order[a]];
 play.selected=null;
 miniDrawScraps();
 miniFinalize();
}
function miniRotatePiece(slot){
 if(!miniHardPaper())return;
 const piece=play.order[slot];
 play.rotations[piece]=(play.rotations[piece]+90)%360;
 play.selected=slot;
 miniDrawScraps();
 miniFinalize();
}
function miniRotateSelected(){
 if(!miniHardPaper())return;
 if(play.selected===null){miniHint('Сначала выберите обрывок, затем нажмите «Повернуть».');return;}
 miniRotatePiece(play.selected);
}
function miniChooseScrap(n){
 if(play.solved)return;
 if(play.selected===null){play.selected=n;miniDrawScraps();return}
 const a=play.selected;play.selected=null;
 if(a!==n)miniSwap(a,n);else miniDrawScraps();
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
 root.classList.toggle('mini-hard',miniHardPaper());
 const renderTile=(piece,slot)=>'<button type="button" class="mini-scrap '+(slot===play.selected?'mini-picked':'')+'" data-slot="'+slot+'" onclick="miniChooseScrap('+slot+')"'+(miniHardPaper()?' ondblclick="miniRotatePiece('+slot+')"':'')+' aria-label="Обрывок бумаги. Выбрать и передвинуть">'+miniPaperFragment(piece)+'</button>';
 root.innerHTML=miniHardPaper()?
   '<div class="mini-paper-workspace"><div class="mini-hard-board">'+play.order.slice(0,12).map((p,i)=>renderTile(p,i)).join('')+'</div><div class="mini-paper-tray"><div class="mini-tray-caption">Неразобранные фрагменты · после сборки здесь останутся 3 посторонних обрывка</div><div class="mini-hard-tray">'+play.order.slice(12).map((p,i)=>renderTile(p,i+12)).join('')+'</div></div></div>':
   play.order.map((p,i)=>renderTile(p,i)).join('');
 const stat=document.getElementById('miniCorrect');
 if(stat)stat.textContent=miniSolved()?'Документ собран, все 12 частей на местах.':'Нужно восстановить 12 частей документа; среди 15 обрывков три относятся к другим листам.';
 const rotation=document.getElementById('miniRotateButton');
 if(rotation)rotation.disabled=!miniHardPaper()||play.selected===null;
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
  stage='<p class="mini-instruction">'+esc(miniScene().puzzle)+(miniHardPaper()?' <b>Экспертная сложность:</b> перед вами 15 перемешанных обрывков, из которых только 12 принадлежат искомой странице. Некоторые фрагменты перевёрнуты: восстановите 4 ряда по 3 элемента, совместите рисунок разрывов, продолжения текста и печати. Три чужих фрагмента оставьте в нижнем лотке.':' Перед вами девять фрагментов одной повреждённой страницы. Сопоставляйте контуры разрывов и строки текста.')+'</p><div class="mini-correct" id="miniCorrect"></div><div class="mini-puzzle-scroll"><div class="mini-scraps" id="miniScraps"></div></div><div class="mini-puzzle-actions">'+(miniHardPaper()?'<button id="miniRotateButton" class="light slim" onclick="miniRotateSelected()" disabled>Повернуть выбранный на 90°</button>':'')+'<button id="miniZoomButton" class="light slim" onclick="miniToggleZoom()">Увеличить фрагменты</button></div><p class="mini-instruction">Перетащите один клочок на другой, чтобы поменять их местами, или выберите два по очереди. Для вращения сначала выделите деталь. На компьютере можно дважды щёлкнуть по обрывку.</p>';
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
