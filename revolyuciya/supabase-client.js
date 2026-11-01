/* Supabase transport for "Revolutionary Situation".
 * Private write operations are authorized by per-room host/player tokens in the Edge Function.
 * No service-role credentials are exposed in this static frontend.
 */
const SB_URL = 'https://logzbhhftwvqsrqvmnik.supabase.co/functions/v1/revolution-game';
const SB_KEY = 'sb_publishable_gUO0b5EHdgs_vS39Iqi4pQ_tU-7tPuw';
const hostKey = code => 'rev_host_token_' + code;
const playerKey = code => 'rev_player_token_' + code;
const secureToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
  b => b.toString(16).padStart(2,'0')).join('');
let NETERR='', CREATING=false;
function netError(e) {
 NETERR = e && e.message ? e.message : String(e);
 const el = document.getElementById('neterror');
 if (el) el.textContent = 'Ошибка синхронизации: ' + NETERR;
 else if(typeof render==='function')render();
}
async function sbRequest(payload) {
 const response = await fetch(SB_URL,{method:'POST',headers:{
  'Content-Type':'application/json','apikey':SB_KEY
 },body:JSON.stringify(payload),cache:'no-store'});
 let data;
 try {data=await response.json()} catch {throw Error('Невозможно прочитать ответ Supabase')}
 if(!response.ok || data.error){
  const e=new Error(data.error || ('HTTP '+response.status));
  e.status=response.status;
  throw e;
 }
 return data;
}
function mkSB(code) {
 let snap=null,version=null,pending=null,queue=Promise.resolve(),active=true;
 const listeners=new Set();
 const access=()=>({
  hostToken:ROLE==='host'?lsGet(hostKey(code))||undefined:undefined,
  playerToken:ROLE==='player'?lsGet(playerKey(code))||undefined:undefined
 });
 const pathValue=path=>path.split('/').filter(Boolean).reduce(
  (a,k)=>a==null?null:a[k],snap);
 function publish(){
  if(!active)return;
  for(const l of [...listeners]){
   let value=pathValue(l.path);
   if(value===undefined)value=null;
   const serialized=JSON.stringify(value);
   if(serialized!==l.last){
    l.last=serialized;
    try{l.cb(value===null?null:JSON.parse(serialized))}
    catch(e){console.error('Ошибка обновления экрана',e)}
   }
  }
 }
 async function refresh(force=false){
  if(!active)return;
  if(pending)return pending;
  pending=(async()=>{
   const answer=await sbRequest({op:'read',code,...access(),
    ...(!force&&version!==null?{since:version}:{})});
   if(answer.unchanged)return;
   version=answer.version;snap=answer.snapshot;
   NETERR='';publish();
  })();
  try{await pending}catch(e){
   if(e.status===404||e.status===410){
    version=null;snap={meta:null,state:null,slots:{},choices:{},votes:{},bg:null};publish();
   } else netError(e);
  }finally{pending=null}
 }
 function write(op,path,value,extra){
  // Preserve authorization at click time (the role may change before the queue flushes).
  const credentials=access();
  const task=queue.catch(()=>{}).then(async()=>{
   const answer=await sbRequest({op,code,...credentials,path,value,...extra});
   await refresh(true);
   return !!answer.ok;
  });
  queue=task;
  return task.catch(e=>{netError(e);return false});
 }
 const interval=setInterval(()=>{if(active)refresh()},1300);
 const visibility=()=>{if(document.visibilityState==='visible')refresh(true)};
 document.addEventListener('visibilitychange',visibility);
 return {
  local:false,
  refreshAuth:()=>refresh(true),
  on(path,cb){
   const listener={path,cb,last:undefined};
   listeners.add(listener);
   if(snap)publish();else refresh(true);
   return()=>listeners.delete(listener);
  },
  async once(path){if(!snap)await refresh(true);return pathValue(path)??null},
  set:(path,value)=>write('set',path,value),
  remove:path=>write('remove',path,null),
  claim:async(path,value)=>{
   const role=path.split('/')[1];
   let token=lsGet(playerKey(code));
   if(!token){token=secureToken();lsSet(playerKey(code),token)}
   return await write('claim',path,null,{role,pid:value.pid,playerToken:token});
  },
  stop(){active=false;clearInterval(interval);
   document.removeEventListener('visibilitychange',visibility);listeners.clear()}
 };
}
async function createSupabaseRoom(){
 if(CREATING)return;
 CREATING=true;NETERR='';
 render();
 try{
  for(let attempt=0;attempt<6;attempt++){
   const code=genCode(),token=secureToken(),meta={n:S.n,t:Date.now()};
   try{
    await sbRequest({op:'create',code,hostToken:token,meta,state:S});
    if(DB){DB.stop();DB=null}
    CODE=code;VIEW='';
    lsSet(hostKey(code),token);lsSet('rev_host',code);
    ROLE='host';setUrl();READY=true;LASTJ=JSON.stringify(S);
    connect();render();return;
   }catch(e){if(e.status===409)continue;throw e}
  }
  throw Error('Не удалось подобрать свободный код комнаты');
 }catch(e){netError(e)}
 finally{CREATING=false;render()}
}
function disconnectRoom(){
 UNS.forEach(f=>f());UNS=[];SUBR=-1;
 if(DB){DB.stop();DB=null}
 READY=false;LOADED=false;META=undefined;SL={};CH={};VT={};
 BGDATA=null;LASTJ='';
}
