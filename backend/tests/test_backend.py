"""Backend tests for APDCL Connect - iteration 2 (comments, participants, admin analytics)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


def _login(eid, pw):
    r = requests.post(f"{API}/auth/login", json={"employee_id": eid, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login {eid} failed: {r.status_code} {r.text}"
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="session")
def admin():
    tok, u = _login("AP10000", "Admin@123")
    return {"token": tok, "user": u, "headers": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="session")
def employee():
    tok, u = _login("AP10234", "Employee@123")
    return {"token": tok, "user": u, "headers": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="session")
def employee2():
    # Try secondary employee, fallback to AP10234
    for eid in ("AP10789", "AP10812", "AP10456", "AP10234"):
        try:
            tok, u = _login(eid, "Employee@123")
            return {"token": tok, "user": u, "headers": {"Authorization": f"Bearer {tok}"}}
        except AssertionError:
            continue
    pytest.skip("no secondary employee available")


# --- Auth basics ---
def test_admin_login_role(admin):
    assert admin["user"]["role"] == "admin"


def test_employee_login_role(employee):
    assert employee["user"]["role"] == "employee"


# --- Queries: participants / totals ---
def test_list_queries_has_new_fields(employee):
    r = requests.get(f"{API}/queries", headers=employee["headers"], timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and len(data["items"]) > 0
    q = data["items"][0]
    for key in ("participants", "comment_count", "reactor_count", "total_employees"):
        assert key in q, f"missing {key} in query response"
    # total_employees counts role=employee only
    assert isinstance(q["total_employees"], int) and q["total_employees"] >= 1


def test_total_employees_matches_role_employee(admin, employee):
    r_e = requests.get(f"{API}/admin/employees", headers=admin["headers"], timeout=15)
    assert r_e.status_code == 200
    emp_count = len(r_e.json())
    r_q = requests.get(f"{API}/queries", headers=employee["headers"], timeout=15)
    q = r_q.json()["items"][0]
    assert q["total_employees"] == emp_count, f"{q['total_employees']} != {emp_count}"


# --- Comments CRUD ---
@pytest.fixture(scope="session")
def a_query(employee):
    r = requests.get(f"{API}/queries", headers=employee["headers"], timeout=15)
    return r.json()["items"][0]


def test_comment_requires_auth(a_query):
    r = requests.post(f"{API}/queries/{a_query['id']}/comments", json={"text": "hi"}, timeout=15)
    assert r.status_code == 401


def test_add_comment_and_participants(employee, a_query):
    r = requests.post(
        f"{API}/queries/{a_query['id']}/comments",
        headers=employee["headers"],
        json={"text": "TEST_comment from AP10234"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["comment_count"] >= 1
    # participants should contain this user
    uids = [p["user_id"] for p in data["participants"]]
    assert employee["user"]["id"] in uids
    p = next(p for p in data["participants"] if p["user_id"] == employee["user"]["id"])
    assert p["name"] and p["designation"] and p["department"]
    assert any(c["text"] == "TEST_comment from AP10234" for c in p["comments"])
    # save cid for later
    cid = next(c["id"] for c in p["comments"] if c["text"] == "TEST_comment from AP10234")
    pytest.shared_cid = cid
    pytest.shared_qid = a_query["id"]


def test_non_owner_cannot_delete(employee2):
    if not hasattr(pytest, "shared_cid"):
        pytest.skip("no cid")
    if employee2["user"]["employee_id"] == "AP10234":
        pytest.skip("only one employee available")
    r = requests.delete(
        f"{API}/queries/{pytest.shared_qid}/comments/{pytest.shared_cid}",
        headers=employee2["headers"], timeout=15,
    )
    assert r.status_code == 403, r.text


def test_admin_can_delete_any_comment(admin, employee, a_query):
    # add another comment then admin deletes
    r = requests.post(
        f"{API}/queries/{a_query['id']}/comments",
        headers=employee["headers"], json={"text": "TEST_to_be_admin_deleted"}, timeout=15,
    )
    assert r.status_code == 200
    cid = None
    for p in r.json()["participants"]:
        for c in p["comments"]:
            if c["text"] == "TEST_to_be_admin_deleted":
                cid = c["id"]
    assert cid
    r2 = requests.delete(f"{API}/queries/{a_query['id']}/comments/{cid}", headers=admin["headers"], timeout=15)
    assert r2.status_code == 200


def test_owner_can_delete_own(employee):
    if not hasattr(pytest, "shared_cid"):
        pytest.skip()
    r = requests.delete(
        f"{API}/queries/{pytest.shared_qid}/comments/{pytest.shared_cid}",
        headers=employee["headers"], timeout=15,
    )
    assert r.status_code == 200


def test_comment_length_validation(employee, a_query):
    r = requests.post(f"{API}/queries/{a_query['id']}/comments", headers=employee["headers"], json={"text": ""}, timeout=15)
    assert r.status_code == 422


def test_new_comment_triggers_notification(employee, a_query):
    # a_query author is another user, so employee AP10234 commenting should notify them
    # Ensure query is not owned by AP10234; find one that isn't
    r = requests.get(f"{API}/queries", headers=employee["headers"], timeout=15)
    other_q = None
    for q in r.json()["items"]:
        if q["user_id"] != employee["user"]["id"]:
            other_q = q
            break
    if not other_q:
        pytest.skip("no query by other user")
    # comment
    requests.post(
        f"{API}/queries/{other_q['id']}/comments",
        headers=employee["headers"], json={"text": "TEST_notif trigger"}, timeout=15,
    )
    # login as author and check notifications
    # find author's employee_id
    author_eid = other_q["author"]["employee_id"]
    try:
        tok, _ = _login(author_eid, "Employee@123")
    except AssertionError:
        pytest.skip(f"cannot login as {author_eid}")
    n = requests.get(f"{API}/notifications", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    assert n.status_code == 200
    items = n.json()["items"]
    assert any(x["type"] == "new_comment" for x in items), "no new_comment notification"


# --- Admin analytics ---
def test_admin_analytics_requires_admin(employee):
    r = requests.get(f"{API}/admin/analytics", headers=employee["headers"], timeout=15)
    assert r.status_code == 403


def test_admin_analytics_shape(admin):
    r = requests.get(f"{API}/admin/analytics", headers=admin["headers"], timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("monthly", "this_month", "top_queries", "recent_comments", "departments", "totals"):
        assert k in d, f"missing {k}"
    assert isinstance(d["monthly"], list) and len(d["monthly"]) == 6
    for m in d["monthly"]:
        assert "label" in m and "queries" in m and "comments" in m and "reactions" in m
    assert set(d["totals"].keys()) >= {"employees", "queries", "reactions", "comments"}
    assert set(d["this_month"].keys()) >= {"queries", "comments", "reactions"}
    # top_queries capped at 5, recent_comments capped at 10
    assert len(d["top_queries"]) <= 5
    assert len(d["recent_comments"]) <= 10
    for rc in d["recent_comments"]:
        assert "author_name" in rc and "query_title" in rc


# --- Cascade delete ---
def test_delete_query_cascades_comments(admin, employee):
    # Create a query as employee, add a comment, then admin deletes query
    r = requests.post(f"{API}/queries", headers=employee["headers"], json={
        "title": "TEST_cascade query", "description": "will be deleted"
    }, timeout=15)
    assert r.status_code == 200
    qid = r.json()["id"]
    requests.post(f"{API}/queries/{qid}/comments", headers=employee["headers"], json={"text": "TEST_c1"}, timeout=15)
    # Delete the query
    d = requests.delete(f"{API}/queries/{qid}", headers=admin["headers"], timeout=15)
    assert d.status_code == 200
    # Analytics recent_comments should not contain a reference to this query title anymore in its title (may show '(deleted query)' if any orphans)
    # Direct check: count comments for that qid via analytics recent_comments
    a = requests.get(f"{API}/admin/analytics", headers=admin["headers"], timeout=15).json()
    for rc in a["recent_comments"]:
        assert rc["query_id"] != qid, "orphaned comment after query delete"
