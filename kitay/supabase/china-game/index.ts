// China Diplomacy game API, 2026-11-01. Supabase Edge Function.
// Public transport endpoint; host/player authorization is verified per request.
// Only service role credentials stored in Supabase server environment are used for database access.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ROLES = ['cn', 'us', 'ru', 'in', 'eu', 'as'];
const LIMIT = 150000;
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {...cors, 'Content-Type':'application/json;charset=utf-8'}
});
function isToken(v: unknown): v is string { return typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v); }
function isCode(v: unknown): v is string { return typeof v === 'string' && /^[A-Z0-9]{4}$/.test(v); }
function obj(v: unknown): Record<string, any> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string,any> : {}; }
async function sha(v: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(bytes), n=>n.toString(16).padStart(2,'0')).join('');
}
async function pg(method: string, path: string, value?: unknown): Promise<any> {
  if (!SUPABASE_URL || !SERVICE) throw Error('Supabase server environment not configured');
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method, headers: {'apikey': SERVICE, 'Authorization':'Bearer ' + SERVICE,
      'Content-Type':'application/json', 'Prefer':'return=representation'},
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  const text = await r.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const e: any = Error(typeof data === 'object' ? (data.message || data.code || 'Ошибка БД') : 'Ошибка БД');
    e.status = r.status;
    throw e;
  }
  return data;
}
async function readRoom(code: string) {
  const rows = await pg('GET','china_game_rooms?code=eq.' + code + '&select=*');
  return rows[0] || null;
}
function safeSnapshot(room: any, host: boolean, role: string | null) {
  const d = obj(room.data);
  const state = obj(d.state);
  const snapshot: Record<string, any> = {
    meta:d.meta || null, state:d.state || null, seats:obj(d.seats), choices:{}, votes:{}
  };
  const exposed = state.stage === 'reveal' || state.stage === 'final';
  for (const [round, selections] of Object.entries(obj(d.choices))) {
    snapshot.choices[round] = {};
    for (const [id, selected] of Object.entries(obj(selections))) {
      // -1 indicates a received but not-yet-disclosed decision.
      snapshot.choices[round][id] = host || exposed || role === id ? selected : -1;
    }
  }
  if (host) snapshot.votes = obj(d.votes);
  else if (role) {
    const seat = obj(obj(d.seats)[role]);
    for (const [round, ballots] of Object.entries(obj(d.votes))) {
      if (seat.pid && Object.prototype.hasOwnProperty.call(obj(ballots), seat.pid)) {
        snapshot.votes[round] = { [seat.pid]: obj(ballots)[seat.pid] };
      }
    }
  }
  return snapshot;
}
function playerRole(room: any, tokenHash: string) {
  for (const id of ROLES) if (obj(room.seat_auth)[id] === tokenHash) return id;
  return null;
}
function modify(room: any, request: Record<string,any>, host: boolean, role: string|null, tokenHash: string) {
  const d = structuredClone(obj(room.data)), a = structuredClone(obj(room.seat_auth));
  const s = obj(d.state), meta = obj(d.meta);
  let ok: boolean | null = true;
  if (request.op === 'claim') {
    const id = request.role;
    const pid = request.pid;
    if (!ROLES.includes(id) || ROLES.indexOf(id) >= Number(meta.n||6) || !isToken(request.playerToken) ||
        typeof pid !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(pid)) throw Error('Неверная заявка на делегацию');
    const existing = obj(d.seats)[id];
    if (existing && a[id] !== tokenHash) return {ok:false, data:d, seatAuth:a, skip:true};
    // A single device cannot claim multiple different roles.
    if (Object.entries(a).some(([other, hash]) => other !== id && hash === tokenHash))
      throw Error('Это устройство уже представляет другую делегацию');
    d.seats = {...obj(d.seats), [id]:{pid,joined:existing?.joined||Date.now()}};
    a[id] = tokenHash;
  } else if (request.op === 'set') {
    const path = request.path;
    const value = request.value;
    if (typeof path !== 'string') throw Error('Неверный адрес записи');
    if (path === 'meta' || path === 'state') {
      if (!host || !value || typeof value !== 'object' || Array.isArray(value)) throw Error('Только ведущий может изменять игру');
      if (path === 'meta' && ![4,5,6].includes(Number(value.n))) throw Error('Некорректное число делегаций');
      if (path === 'state' && (!['lobby','intro','talk','speech','choose','reveal','final'].includes(value.stage) ||
          !Number.isInteger(value.r) || value.r < 0 || value.r > 5 || !Array.isArray(value.hist) || value.hist.length > 6))
        throw Error('Некорректное состояние раунда');
      d[path] = value;
    } else if (path === 'seats' && value === null && host) {
      d.seats = {}; Object.keys(a).forEach(k=>delete a[k]);
    } else if ((path === 'choices' || path === 'votes') && value === null && host) {
      d[path] = {};
    } else if (/^choices\/[0-5]\/(cn|us|ru|in|eu|as)$/.test(path)) {
      const [_, round, id] = path.split('/');
      if (s.stage !== 'choose' || Number(round) !== s.r || ROLES.indexOf(id)>=Number(meta.n||6) ||
          (!host && role !== id) || !Number.isInteger(value) || value < 0 || value > 2)
        throw Error('Нельзя сохранить это решение');
      d.choices = {...obj(d.choices), [round]:{...obj(obj(d.choices)[round]),[id]:value}};
    } else if (/^votes\/[0-5]\/[a-zA-Z0-9_-]{8,80}$/.test(path)) {
      const [_, round, pid] = path.split('/');
      if (s.stage !== 'choose' || Number(round) !== s.r || !role ||
          obj(obj(d.seats)[role]).pid !== pid || !ROLES.includes(value) ||
          value === role || ROLES.indexOf(value)>=Number(meta.n||6)) throw Error('Голосование недоступно');
      d.votes = {...obj(d.votes), [round]:{...obj(obj(d.votes)[round]),[pid]:value}};
    } else throw Error('Запись недоступна для текущего участника');
  } else throw Error('Неизвестное действие');
  if (JSON.stringify(d).length > LIMIT) throw Error('Лимит данных игровой комнаты превышен');
  return {ok, data:d, seatAuth:a, skip:false};
}
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
  if (req.method !== 'POST') return reply({error:'Требуется POST'},405);
  try {
    const raw = await req.text();
    if (raw.length > LIMIT) return reply({error:'Слишком большой запрос'},413);
    let q: Record<string,any>;
    try { q = obj(JSON.parse(raw)); } catch {return reply({error:'Неверный JSON'},400);}
    const code = q.code;
    if (!isCode(code)) return reply({error:'Неверный код комнаты'},400);
    if (q.op === 'create') {
      if (!isToken(q.hostToken) || !q.meta || !q.state ||
          ![4,5,6].includes(Number(q.meta.n)) || q.state.stage !== 'lobby')
        return reply({error:'Некорректная новая комната'},400);
      const row = {code,host_hash:await sha(q.hostToken),seat_auth:{},
        data:{meta:q.meta,state:q.state,seats:{},choices:{},votes:{}}};
      try {await pg('POST','china_game_rooms',row);} catch(e:any) {
        if (e.status === 409) return reply({error:'Код комнаты занят. Создайте ещё раз.'},409);
        throw e;
      }
      return reply({ok:true});
    }
    if (!['read','claim','set'].includes(q.op)) return reply({error:'Неизвестная операция'},400);
    // Strong random host/player secrets are stored only as SHA-256 hashes in Postgres.
    const hostHash = isToken(q.hostToken) ? await sha(q.hostToken) : '';
    const seatHash = isToken(q.playerToken) ? await sha(q.playerToken) : '';
    for (let attempt=0;attempt<6;attempt++) {
      const room = await readRoom(code);
      if (!room) return reply({error:'Комната не найдена'},404);
      if (new Date(room.expires_at).getTime() < Date.now()) return reply({error:'Срок действия комнаты истёк'},410);
      const host = !!hostHash && hostHash === room.host_hash;
      const role = !!seatHash ? playerRole(room,seatHash) : null;
      if (q.op === 'read') return reply({ok:true, snapshot:safeSnapshot(room,host,role)});
      if (q.op === 'claim' && !seatHash) return reply({error:'Нет ключа делегации'},403);
      let change;
      try {change=modify(room,q,host,role,seatHash);}catch(e:any){return reply({error:e.message},403);}
      if (change.skip) return reply({ok:false});
      const updated=await pg('PATCH','china_game_rooms?code=eq.'+code+'&version=eq.'+room.version,
        {data:change.data,seat_auth:change.seatAuth,version:Number(room.version)+1});
      if (updated.length) return reply({ok:true});
    }
    return reply({error:'Комната занята, повторите действие'},409);
  } catch(e:any) {
    return reply({error:'Сервер: '+(e?.message||'неизвестная ошибка')},500);
  }
});