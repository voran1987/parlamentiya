#!/usr/bin/env python3
"""End-to-end remote smoke test for the Constitution game Supabase endpoint."""
import json
import sys
import urllib.error
import urllib.request

API = "https://logzbhhftwvqsrqvmnik.supabase.co/functions/v1/constitution-game-api"

def call(action, **params):
    payload = json.dumps({"action": action, **params}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(API, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def check(label, condition, payload=None):
    if not condition:
        raise AssertionError(label + ": " + repr(payload))
    print("PASS", label)

status, created = call("create")
check("create game", status == 200 and created.get("room") and created.get("hostSecret"), {"status":status,"error":created.get("error")})
room, secret = created["room"], created["hostSecret"]
host = {"room":room,"hostSecret":secret}
status, joined = call("join", room=room, name="Тестовый участник", team=1)
check("student joins with no password", status == 200 and joined.get("playerToken"), {"status":status,"error":joined.get("error")})
student = {"room":room,"playerToken":joined["playerToken"]}
status, result = call("start", **host)
check("start first round", status == 200, result)
status, result = call("open", key="r1a1", **host)
check("open round 1 question", status == 200, result)
status, result = call("answer", choice=1, **student)
check("first team answer accepted", status == 200, result)
status, result = call("answer", choice=0, **student)
check("duplicate team answer blocked", status == 409, result)
status, result = call("reveal", **host)
check("reveal and score first round", status == 200, result)
status, snapshot = call("state", **host)
check("team earned 100 points", status == 200 and next(t for t in snapshot["teams"] if t["team_num"] == 1)["score"] == 100, {"status":status,"error":snapshot.get("error")})
status, result = call("close", **host)
check("close question", status == 200, result)
status, result = call("advance", **host)
check("advance to round 2", status == 200, result)
status, result = call("open", key="r2a1", **host)
check("open round 2 question", status == 200, result)
status, result = call("reveal", **host)
check("reveal unanswered question", status == 200, result)
status, result = call("advance", **host)
check("advance to supergame", status == 200, result)
status, result = call("open", key="s1", **host)
check("open supergame", status == 200, result)
status, result = call("answer", choice=1, wager=100, **student)
check("team supergame wager accepted", status == 200, result)
status, result = call("reveal", **host)
check("reveal supergame", status == 200, result)
status, snapshot = call("state", **host)
check("supergame wager credited", status == 200 and next(t for t in snapshot["teams"] if t["team_num"] == 1)["score"] == 200, {"status":status,"error":snapshot.get("error")})
status, result = call("advance", **host)
check("finish game", status == 200, result)
status, result = call("reset", dropPlayers=True, **host)
check("reset game", status == 200, result)
print("ALL SMOKE TESTS PASSED")
