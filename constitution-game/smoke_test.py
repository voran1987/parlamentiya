#!/usr/bin/env python3
"""Live integration test: atomic first-press buzzers and oral grading."""
import json
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

URL="https://logzbhhftwvqsrqvmnik.supabase.co/functions/v1/constitution-game-api"
def call(action,**fields):
    req=urllib.request.Request(URL, data=json.dumps({"action":action,**fields},ensure_ascii=False).encode(), headers={"Content-Type":"application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req,timeout=30) as response:
            return response.status,json.load(response)
    except urllib.error.HTTPError as e:
        return e.code,json.loads(e.read().decode())

def check(title,good,value=None):
    if not good:raise AssertionError(title+": "+repr(value))
    print("PASS",title,flush=True)

status,x=call("create")
check("create room",status==200 and x.get("room") and x.get("hostSecret"),x)
room=x["room"];host={"room":room,"hostSecret":x["hostSecret"]}
status,x=call("join",room=room,name="Student A",team=1)
check("student A joins",status==200 and x.get("playerToken"),x)
p1={"room":room,"playerToken":x["playerToken"]}
status,x=call("join",room=room,name="Student B",team=2)
check("student B joins",status==200 and x.get("playerToken"),x)
p2={"room":room,"playerToken":x["playerToken"]}
status,x=call("join",room=room,name="Another teammate",team=1)
check("second teammate joins",status==200 and x.get("playerToken"),x)
p1b={"room":room,"playerToken":x["playerToken"]}
status,x=call("state",**host)
check("25+25 questions and supergame unchanged",status==200 and len(x["round1"])==25 and len(x["round2"])==25 and len(x["superBoard"])==3,x)
check("new rooms start with no active buzzer",x.get("buzzActiveTeam") is None,x)
status,x=call("start",**host);check("begin round one",status==200,x)
status,x=call("open",key="r1a1",**host);check("open first question",status==200,x)
status,x=call("state",**p1)
check("button open and no multiple choice",status==200 and x.get("buzzOpen")==True and "options" not in x["question"],x)
with ThreadPoolExecutor(max_workers=2) as executor:
    future1=executor.submit(call,"buzz",**p1)
    future2=executor.submit(call,"buzz",**p2)
    a=future1.result();b=future2.result()
check("only one simultaneous team buzz wins",sorted([a[0],b[0]])==[200,409],(a,b))
winner=1 if a[0]==200 else 2
loser=2 if winner==1 else 1
winning=p1 if winner==1 else p2
losing=p2 if loser==2 else p1
status,x=call("state",**host)
check("server records single first team",x["buzzActiveTeam"]==winner and not x["buzzOpen"] and x["attemptedTeams"]==[winner],x)
status,x=call("buzz",**p1b) if winner==1 else call("buzz",**losing)
check("button locked while team speaks",status==409,x)
status,x=call("grade",team=winner,grade=-1,**host)
check("wrong oral answer loses half value",status==200 and x["delta"]==-50,x)
status,x=call("state",**host)
check("wrong answer reopens other team buzzers",x["buzzActiveTeam"] is None and x["buzzOpen"] is True,x)
status,x=call("buzz",**winning)
check("same team cannot answer twice",status==409,x)
status,x=call("buzz",**losing)
check("other team may buzz after incorrect answer",status==200,x)
status,x=call("state",**host)
check("new first team displayed",x["buzzActiveTeam"]==loser and not x["buzzOpen"],x)
status,x=call("grade",team=loser,grade=1,**host)
check("correct oral answer earns full value",status==200 and x["delta"]==100,x)
status,x=call("state",**host)
check("correct answer locks buzzer",x["buzzActiveTeam"] is None and not x["buzzOpen"],x)
status,x=call("reveal",**host);check("show right answer",status==200,x)
status,x=call("close",**host);check("close current question",status==200,x)
status,x=call("advance",**host);check("move to second round",status==200,x)
status,x=call("open",key="r2a1",**host);check("open 200-point question",status==200,x)
status,x=call("buzz",**p1)
check("buzz works in round two",status==200,x)
status,x=call("grade",team=1,grade=1,**host)
check("manual award for round two",status==200 and x["delta"]==200,x)
status,x=call("reveal",**host);check("reveal round two",status==200,x)
status,x=call("close",**host);check("close round two",status==200,x)
status,x=call("advance",**host);check("enter supergame",status==200,x)
status,x=call("open",key="s1",**host);check("open supergame",status==200,x)
status,x=call("buzz",wager=100,**p2)
check("supergame buzz with wager",status==200,x)
status,x=call("grade",team=2,grade=1,**host)
check("supergame awards wager",status==200 and x["delta"]==100,x)
status,x=call("reveal",**host);check("supergame reveal",status==200,x)
status,x=call("advance",**host);check("finish tournament",status==200,x)
status,x=call("reset",dropPlayers=True,**host)
check("reset tournament",status==200,x)
status,x=call("state",**host)
check("reset clears active buzzer",x["phase"]=="lobby" and x["buzzActiveTeam"] is None and not x["buzzOpen"],x)
print("ALL BUZZER TESTS PASSED",flush=True)
