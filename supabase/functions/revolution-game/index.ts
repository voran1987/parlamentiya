// Revolutionary Situation — secure room API (Supabase Edge Function).
// Only this server uses the Supabase service-role key. The browser never receives it.
const CORS: Record<string,string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store'
};
const URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TABLE = 'revolution_game_rooms';
const ROLES = ['reg','opp','arm','eli','int','ext'];
const MAX_BYTES = 640000;
type Dict = Record<string,any>;
const json = (v: unknown, status=200) => new Response(JSON.stringify(v), {status,
  headers:{...CORS,'Content-Type':'application/json;charset=utf-8'}});
const isCode = (v:unknown):v is string => typeof v==='string' && /^[A-Z0-9]{4}$/.test(v);
const isToken = (v:unknown):v is string => typeof v==='string' && /^[a-f0-9]{64}$/.test(v);
const obj = (v:unknown):Dict => v!==null && typeof v==='object' && !Array.isArray(v) ? v as Dict : {};
const err = (message:string,status=403) => {const e:any=new Error(message);e.status=status;throw e};
const roomRoles = (n:number) => ROLES.slice(0,n);
async function digest(token:string):Promise<string>{
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function pg(method:string,path:string,value?:unknown):Promise<any>{
 if(!URL||!SERVICE)err('Сервер Supabase не настроен',503);
 const response=await fetch(URL+'/rest/v1/'+path,{
  method,headers:{apikey:SERVICE,Authorization:'Bearer '+SERVICE,
   'Content-Type':'application/json','Prefer':'return=representation'},
  body:value===undefined?undefined:JSON.stringify(value)
 });
 const raw=await response.text();let data:any;
 try{data=raw?JSON.parse(raw):null}catch{data=raw}
 if(!response.ok){const e:any=new Error(typeof data==='object'?(data.message||data.code||'Ошибка БД'):'Ошибка БД');e.status=response.status;throw e}
 return data;
}
async function getRoom(code:string,projection='*'){
 const rows=await pg('GET',TABLE+'?code=eq.'+code+'&select='+encodeURIComponent(projection));
 return rows?.[0]||null;
}
function isHost(room:Dict, tokenHash:string){return !!tokenHash && room.host_hash===tokenHash}
function asPlayer(room:Dict, tokenHash:string):string|null{
 if(!tokenHash)return null;
 for(const role of ROLES)if(obj(room.seat_auth)[role]===tokenHash)return role;
 return null;
}
function safeSnapshot(room:Dict,host:boolean,role:string|null){
 const d=obj(room.data),s=obj(d.state),shown=!!(s.cur?.rev || s.phase==='final');
 const snap:Dict={meta:d.meta??null,state:d.state??null,slots:obj(d.slots),bg:d.bg??null,choices:{},votes:{}};
 for(const [round,all] of Object.entries(obj(d.choices))){
  snap.choices[round]={};
  for(const [id,choice] of Object.entries(obj(all))){
   snap.choices[round][id]=(host||shown||role===id)?choice:-1;
  }
 }
 if(host){snap.votes=obj(d.votes)}
 else if(role){
  for(const [round,ballots] of Object.entries(obj(d.votes))){
   const vote=obj(ballots)[role];
   if(vote!==undefined)snap.votes[round]={[role]:vote};
  }
 }
 return snap;
}
function validState(v:unknown){
 const s=obj(v);
 return ['setup','intro','play','final'].includes(s.phase)
  && Number.isInteger(s.n) && s.n>=2 && s.n<=6
  && Number.isInteger(s.r) && s.r>=0 && s.r<=5
  && Array.isArray(s.hist) && s.hist.length<=6
  && !!s.cur && typeof s.cur==='object' && !Array.isArray(s.cur);
}
function modify(room:Dict,q:Dict,host:boolean,role:string|null,playerHash:string){
 const d:Dict=structuredClone(obj(room.data));
 const auth:Dict=structuredClone(obj(room.seat_auth));
 const state=obj(d.state),meta=obj(d.meta),n=Number(meta.n||4);
 const p=String(q.path||''),value=q.value;
 let ok=true;
 if(q.op==='claim'){
  const id=q.role, pid=q.pid;
  if(!ROLES.includes(id) || ROLES.indexOf(id)>=n || !isToken(q.playerToken)
     || typeof pid!=='string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(pid))err('Неверная заявка на роль');
  const existing=obj(d.slots)[id];
  if(existing && auth[id]!==playerHash)return {skip:true,ok:false,data:d,auth};
  if(Object.entries(auth).some(([other,h])=>other!==id&&h===playerHash))
    err('Устройство уже заняло другую роль');
  d.slots={...obj(d.slots),[id]:{pid,ts:existing?.ts||Date.now()}};
  auth[id]=playerHash;
 }else if(q.op==='set'){
  if(p==='state'){
   if(!host||!validState(value))err('Изменять состояние игры может только ведущий');
   d.state=value;
  }else if(p==='meta'||p==='meta/n'){
   if(!host)err('Изменять настройки может только ведущий');
   const next=p==='meta/n'?{...meta,n:value}:value;
   if(!Number.isInteger(next?.n)||next.n<2||next.n>6)err('Неверное число команд');
   d.meta=next;
  }else if(p==='bg'){
   if(!host || typeof value!=='string'||!/^data:image\/jpeg;base64,/.test(value)||value.length>420000)
    err('Фон недопустим или слишком большой');
   d.bg=value;
  }else if(/^choices\/[0-5]\/(reg|opp|arm|eli|int|ext)$/.test(p)){
   const [,round,id]=p.split('/');
   if(state.phase!=='play'||state.cur?.ph!=='choose'||state.cur?.rev||Number(round)!==state.r
      ||ROLES.indexOf(id)>=n||(!host&&role!==id)||!Number.isInteger(value)||value<0||value>2)
     err('Решение сейчас нельзя изменить');
   d.choices={...obj(d.choices),[round]:{...obj(obj(d.choices)[round]),[id]:value}};
  }else if(/^votes\/[0-5]\/(reg|opp|arm|eli|int|ext)$/.test(p)){
   const [,round,id]=p.split('/');
   if(state.phase!=='play'||state.cur?.ph!=='choose'||state.cur?.rev||Number(round)!==state.r
      ||!role||role!==id||!ROLES.includes(value)||value===id||ROLES.indexOf(value)>=n)
     err('Голосование сейчас недоступно');
   d.votes={...obj(d.votes),[round]:{...obj(obj(d.votes)[round]),[id]:value}};
  }else err('Недопустимый адрес записи');
 }else if(q.op==='remove'){
  if(p==='choices'||p==='votes'){
   if(!host)err('Только ведущий может очистить решения');
   d[p]={};
  }else if(p==='bg'){
   if(!host)err('Только ведущий может убрать фон');
   d.bg=null;
  }else if(/^slots\/(reg|opp|arm|eli|int|ext)$/.test(p)){
   const id=p.split('/')[1];
   if(!host&&role!==id)err('Вы не можете освободить чужую роль');
   const copy={...obj(d.slots)};delete copy[id];d.slots=copy;delete auth[id];
   // Keep already submitted decisions, but revoke further access from the released device.
  }else if(/^choices\/[0-5]\/(reg|opp|arm|eli|int|ext)$/.test(p)){
   const [,round,id]=p.split('/');
   if(state.phase!=='play'||state.cur?.ph!=='choose'||state.cur?.rev||Number(round)!==state.r
      ||(!host&&role!==id))err('Отменить решение сейчас нельзя');
   const copy={...obj(obj(d.choices)[round])};delete copy[id];
   d.choices={...obj(d.choices),[round]:copy};
  }else err('Недопустимый адрес удаления');
 }else err('Неизвестное действие');
 if(JSON.stringify(d).length>MAX_BYTES)err('Слишком большой объём данных комнаты',413);
 return {skip:false,ok,data:d,auth};
}
Deno.serve(async (request:Request)=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 if(request.method!=='POST')return json({error:'Требуется POST'},405);
 try{
  const raw=await request.text();
  if(raw.length>MAX_BYTES)return json({error:'Слишком большой запрос'},413);
  let q:Dict;try{q=obj(JSON.parse(raw))}catch{return json({error:'Неверный JSON'},400)}
  if(!isCode(q.code))return json({error:'Неверный код комнаты'},400);
  const code=q.code;
  if(q.op==='create'){
   if(!isToken(q.hostToken)||!validState(q.state)||!Number.isInteger(q.meta?.n)||q.meta.n<2||q.meta.n>6
      ||q.state.phase!=='setup')return json({error:'Неверные параметры новой комнаты'},400);
   const room={code,host_hash:await digest(q.hostToken),seat_auth:{},
    data:{meta:q.meta,state:q.state,slots:{},choices:{},votes:{},bg:null}};
   try{await pg('POST',TABLE,room)}
   catch(e:any){if(e.status===409)return json({error:'Код комнаты уже занят'},409);throw e}
   return json({ok:true,version:0});
  }
  if(!['read','claim','set','remove'].includes(q.op))return json({error:'Неизвестная операция'},400);
  if(q.op==='read'&&Number.isInteger(q.since)&&q.since>=0){
   const lite=await getRoom(code,'version,expires_at');
   if(!lite)return json({error:'Комната не найдена'},404);
   if(Date.parse(lite.expires_at)<Date.now())return json({error:'Срок действия комнаты истёк'},410);
   if(Number(lite.version)===q.since)return json({ok:true,version:lite.version,unchanged:true,serverTime:Date.now()});
  }
  const hostHash=isToken(q.hostToken)?await digest(q.hostToken):'';
  const playerHash=isToken(q.playerToken)?await digest(q.playerToken):'';
  for(let tries=0;tries<6;tries++){
   const room=await getRoom(code);
   if(!room)return json({error:'Комната не найдена'},404);
   if(Date.parse(room.expires_at)<Date.now())return json({error:'Срок действия комнаты истёк'},410);
   const host=isHost(room,hostHash),role=asPlayer(room,playerHash);
   if(q.op==='read')return json({ok:true,snapshot:safeSnapshot(room,host,role),version:room.version,serverTime:Date.now()});
   if(q.op==='claim'&&!playerHash)return json({error:'Нет ключа игрока'},403);
   let change;
   try{change=modify(room,q,host,role,playerHash)}catch(e:any){return json({error:e.message},e.status||403)}
   if(change.skip)return json({ok:false,version:room.version});
   const changed=await pg('PATCH',TABLE+'?code=eq.'+code+'&version=eq.'+room.version,
     {data:change.data,seat_auth:change.auth,version:Number(room.version)+1,updated_at:new Date().toISOString()});
   if(changed.length)return json({ok:true,version:Number(room.version)+1});
  }
  return json({error:'Конфликт изменений, повторите действие'},409);
 }catch(e:any){return json({error:'Ошибка сервера: '+(e?.message||'неизвестная ошибка')},e?.status>=400&&e.status<500?e.status:500)}
});