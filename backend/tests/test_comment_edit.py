"""Backend tests for Iteration 3 - comment edit feature (PUT /api/queries/{qid}/comments/{cid})."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


def _login(eid, pw):
    r = requests.post(f"{API}/auth/login", json={"employee_id": eid, "password": pw}, timeout=15)
    assert r.status_code == 200, f"{eid} login: {r.status_code} {r.text}"
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="module")
def admin():
    tok, u = _login("AP10000", "Admin@123")
    return {"token": tok, "user": u, "headers": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="module")
def emp1():
    tok, u = _login("AP10234", "Employee@123")
    return {"token": tok, "user": u, "headers": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="module")
def emp2():
    for eid in ("AP10789", "AP10812", "AP10456"):
        try:
            tok, u = _login(eid, "Employee@123")
            return {"token": tok, "user": u, "headers": {"Authorization": f"Bearer {tok}"}}
        except AssertionError:
            continue
    pytest.skip("no second employee")


@pytest.fixture()
def a_query(emp1):
    r = requests.get(f"{API}/queries", headers=emp1["headers"], timeout=15)
    return r.json()["items"][0]


def _post_comment(user, qid, text):
    r = requests.post(f"{API}/queries/{qid}/comments", headers=user["headers"], json={"text": text}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    for p in data["participants"]:
        for c in p["comments"]:
            if c["text"] == text and c["user_id"] == user["user"]["id"]:
                return c["id"], data
    raise AssertionError("cid not found after post")


def _find_comment(query_data, cid):
    for p in query_data["participants"]:
        for c in p["comments"]:
            if c["id"] == cid:
                return c
    return None


# --- Edit owner ---
def test_owner_can_edit_own_comment(emp1, a_query):
    cid, _ = _post_comment(emp1, a_query["id"], "TEST_edit_original")
    r = requests.put(
        f"{API}/queries/{a_query['id']}/comments/{cid}",
        headers=emp1["headers"],
        json={"text": "TEST_edit_updated"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    c = _find_comment(data, cid)
    assert c is not None, "comment missing after edit"
    assert c["text"] == "TEST_edit_updated"
    assert "updated_at" in c
    assert c["updated_at"] != c.get("created_at"), "updated_at must differ from created_at"
    # cleanup
    requests.delete(f"{API}/queries/{a_query['id']}/comments/{cid}", headers=emp1["headers"], timeout=15)


# --- Non-owner forbidden ---
def test_non_owner_employee_cannot_edit(emp1, emp2, a_query):
    if emp2["user"]["id"] == emp1["user"]["id"]:
        pytest.skip("only one employee")
    cid, _ = _post_comment(emp1, a_query["id"], "TEST_edit_by_other")
    r = requests.put(
        f"{API}/queries/{a_query['id']}/comments/{cid}",
        headers=emp2["headers"],
        json={"text": "hacked"},
        timeout=15,
    )
    assert r.status_code == 403
    assert "your own" in r.json().get("detail", "").lower()
    requests.delete(f"{API}/queries/{a_query['id']}/comments/{cid}", headers=emp1["headers"], timeout=15)


# --- Admin also cannot edit others' comments ---
def test_admin_cannot_edit_others_comment(emp1, admin, a_query):
    cid, _ = _post_comment(emp1, a_query["id"], "TEST_admin_edit_attempt")
    r = requests.put(
        f"{API}/queries/{a_query['id']}/comments/{cid}",
        headers=admin["headers"],
        json={"text": "admin_override"},
        timeout=15,
    )
    assert r.status_code == 403, f"admin should not be able to edit: {r.status_code} {r.text}"
    # verify text unchanged via GET
    r2 = requests.get(f"{API}/queries", headers=emp1["headers"], timeout=15)
    all_text = str(r2.json())
    assert "TEST_admin_edit_attempt" in all_text
    assert "admin_override" not in all_text
    requests.delete(f"{API}/queries/{a_query['id']}/comments/{cid}", headers=emp1["headers"], timeout=15)


# --- Auth required ---
def test_edit_requires_auth(emp1, a_query):
    cid, _ = _post_comment(emp1, a_query["id"], "TEST_noauth_edit")
    r = requests.put(f"{API}/queries/{a_query['id']}/comments/{cid}", json={"text": "noauth"}, timeout=15)
    assert r.status_code == 401
    requests.delete(f"{API}/queries/{a_query['id']}/comments/{cid}", headers=emp1["headers"], timeout=15)


# --- Validation ---
def test_edit_empty_text_422(emp1, a_query):
    cid, _ = _post_comment(emp1, a_query["id"], "TEST_empty_edit")
    r = requests.put(
        f"{API}/queries/{a_query['id']}/comments/{cid}",
        headers=emp1["headers"],
        json={"text": ""},
        timeout=15,
    )
    assert r.status_code == 422
    requests.delete(f"{API}/queries/{a_query['id']}/comments/{cid}", headers=emp1["headers"], timeout=15)


# --- Nonexistent comment ---
def test_edit_nonexistent_comment_404(emp1, a_query):
    r = requests.put(
        f"{API}/queries/{a_query['id']}/comments/nonexistent-cid",
        headers=emp1["headers"],
        json={"text": "x"},
        timeout=15,
    )
    assert r.status_code == 404
