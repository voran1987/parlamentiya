#!/usr/bin/env python3
"""Integration smoke test: two open-answer 5x5 rounds and supergame."""
import json
import urllib.request
import urllib.error

API="https://logzbhhftwvqsrqvmnik.supabase.co/functions/v1/constitution-game-api"
def call(action,**params):
    body=json.dumps({"action":action,**params},ensure_ascii=False).encode()
    req=urllib.request.Request(API,body,headers={"Content-Type":"application/json"},method="POST")
    try:
        with urllib.request.urlopen(req,timeout=25) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:
        return e.code,json.loads(e.read().decode())
def check(name,ok,value=None):
    if not ok:raise AssertionError(name+" — "+repr(value))
    print("PASS",name,flush=True)
code,x=call("create")
check("create room",code==200 and bool(x.get("room")),x)
room=x["room"];h={"room":room,"hostSecret":x["hostSecret"]}
code,first=call("join",room=room,name="Alpha",team=1)
check("first participant",code==200,first)
code,second=call("join",room=room,name="Beta",team=1)
check("second participant same team",code==200,second)
code,third=call("join",room=room,name="Gamma",team=2)
check("participant second team",code==200,third)
p={"room":room,"playerToken":first["playerToken"]}
p2={"room":room,"playerToken":second["playerToken"]}
p3={"room":room,"playerToken":third["playerToken"]}
code,x=call("state",**h)
check("25 questions each round",len(x.get("round1",[]))==25 and len(x.get("round2",[]))==25,x)
check("three supergame choices",len(x.get("superBoard",[]))==3,x)
check("empty lobby ready",x.get("phase")=="lobby",x)
code,x=call("start",**h);check("start",code==200,x)
code,x=call("open",key="r1a1",**h);check("open 100-point question",code==200,x)
code,x=call("state",**p)
check("question is free-text and has no options",x.get("question",{}).get("text") and "options" not in x.get("question",{}) and "answer" not in x.get("question",{}),x.get("question"))
code,x=call("answer",text="1993 год",**p);check("team1 text answer accepted",code==200,x)
code,x=call("answer",text="другая версия",**p2);check("second answer from same team rejected",code==409,x)
code,x=call("grade",team=1,grade=1,**h);check("teacher grade +100",code==200 and x.get("delta")==100,x)
code,x=call("grade",team=1,grade=1,**h);check("double grading blocked",code==409,x)
code,x=call("state",**h)
check("score after grading",next(t for t in x["teams"] if t["team_num"]==1)["score"]==100,x["teams"])
code,x=call("reveal",**h);check("reveal expected answer",code==200,x)
code,x=call("state",**p)
check("answer visible only after reveal",x["question"].get("answer")=="1993",x["question"])
code,x=call("close",**h);check("close first round question",code==200,x)
code,x=call("advance",**h);check("advance to second round",code==200,x)
code,x=call("open",key="r2a1",**h);check("second round 200-point question",code==200,x)
code,x=call("answer",text="Глава суда",**p3);check("team2 answer",code==200,x)
code,x=call("grade",team=2,grade=-1,**h);check("wrong answer is minus half",code==200 and x.get("delta")==-100,x)
code,x=call("reveal",**h);check("reveal second-round answer",code==200,x)
code,x=call("close",**h);check("close second-round question",code==200,x)
code,x=call("advance",**h);check("enter supergame",code==200,x)
code,x=call("open",key="s1",**h);check("choose supergame topic",code==200,x)
code,x=call("answer",text="Запрет цензуры",wager=100,**p);check("supergame text and wager",code==200,x)
code,x=call("grade",team=1,grade=1,**h);check("supergame awarded wager",code==200 and x.get("delta")==100,x)
code,x=call("reveal",**h);check("reveal supergame",code==200,x)
code,x=call("advance",**h);check("finish game",code==200,x)
code,x=call("state",**h)
check("final score",x["phase"]=="finished" and next(t for t in x["teams"] if t["team_num"]==1)["score"]==200,x)
code,x=call("reset",dropPlayers=True,**h);check("reset",code==200,x)
print("ALL INTEGRATION TESTS PASSED",flush=True)
