from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 7  # 7 days

app = FastAPI(title="APDCL Connect API")
api = APIRouter(prefix="/api")


# ---------------- Utils ----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def sanitize_user(u: dict) -> dict:
    if not u:
        return u
    u = dict(u)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------- Models ----------------
class LoginIn(BaseModel):
    employee_id: str
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class QueryIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)


class VoteIn(BaseModel):
    vote_type: Literal["agree", "disagree"]


class EmployeeIn(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    department: str
    designation: str
    password: str = Field(min_length=8)


class EmployeeUpdateIn(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    designation: Optional[str] = None


# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("employee_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.queries.create_index("user_id")
    await db.queries.create_index("created_at")
    await db.votes.create_index([("query_id", 1), ("user_id", 1)], unique=True)
    await db.notifications.create_index("recipient_user_id")
    await db.notifications.create_index("created_at")
    await seed_admin()
    await seed_sample_data()


async def seed_admin():
    admin_id = os.environ.get("ADMIN_EMPLOYEE_ID", "AP10000")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"employee_id": admin_id})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "employee_id": admin_id,
            "name": "System Administrator",
            "email": "admin@apdcl.org",
            "department": "IT & Systems",
            "designation": "Administrator",
            "password_hash": hash_password(admin_pw),
            "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(admin_pw, existing.get("password_hash", "")):
        await db.users.update_one(
            {"employee_id": admin_id},
            {"$set": {"password_hash": hash_password(admin_pw)}}
        )


async def seed_sample_data():
    if await db.users.count_documents({"role": "employee"}) > 0:
        return
    samples = [
        ("AP10234", "Rupam Das", "rupam.das@apdcl.org", "Guwahati Circle", "Junior Engineer"),
        ("AP10456", "Hiranya Phukan", "hiranya.phukan@apdcl.org", "Guwahati Circle", "Superintending Engineer"),
        ("AP10789", "Anjali Sharma", "anjali.sharma@apdcl.org", "Dibrugarh Circle", "Assistant Manager"),
        ("AP10812", "Bikram Kalita", "bikram.kalita@apdcl.org", "Tezpur Circle", "Executive Engineer"),
    ]
    user_ids = {}
    for eid, name, email, dept, desig in samples:
        uid = str(uuid.uuid4())
        user_ids[eid] = uid
        await db.users.insert_one({
            "id": uid,
            "employee_id": eid,
            "name": name,
            "email": email,
            "department": dept,
            "designation": desig,
            "password_hash": hash_password("Employee@123"),
            "role": "employee",
            "created_at": now_iso(),
        })
    # Sample queries
    sample_queries = [
        (user_ids["AP10456"], "Smart Prepaid Metering Rollout — Phase II",
         "Extending smart prepaid meters to 40,000 more households across Guwahati Circle by Q4. Field teams will be needed for installation and customer onboarding support."),
        (user_ids["AP10789"], "Monsoon feeder maintenance schedule",
         "Proposing a pre-monsoon audit of 33 kV feeders across Dibrugarh Circle. Should we shift the audit window earlier this year?"),
        (user_ids["AP10812"], "Employee training on new SCADA system",
         "The new SCADA rollout requires refresher training for control room engineers. Suggesting a 2-day workshop next month."),
    ]
    for uid, title, desc in sample_queries:
        await db.queries.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "title": title,
            "description": desc,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })


# ---------------- Helpers ----------------
async def enrich_query(q: dict, viewer_id: Optional[str] = None) -> dict:
    author = await db.users.find_one({"id": q["user_id"]}, {"_id": 0, "password_hash": 0})
    votes = await db.votes.find({"query_id": q["id"]}, {"_id": 0}).to_list(10000)
    agree = sum(1 for v in votes if v["vote_type"] == "agree")
    disagree = sum(1 for v in votes if v["vote_type"] == "disagree")
    my_vote = None
    if viewer_id:
        for v in votes:
            if v["user_id"] == viewer_id:
                my_vote = v["vote_type"]
                break
    return {
        **{k: v for k, v in q.items() if k != "_id"},
        "author": author,
        "agree_count": agree,
        "disagree_count": disagree,
        "total_engagement": agree + disagree,
        "my_vote": my_vote,
    }


async def add_notification(recipient_id: str, title: str, message: str, type_: str, related_query_id: Optional[str] = None):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "recipient_user_id": recipient_id,
        "title": title,
        "message": message,
        "type": type_,
        "related_query_id": related_query_id,
        "is_read": False,
        "created_at": now_iso(),
    })


async def notify_admins(title: str, message: str, type_: str, related_query_id: Optional[str] = None, exclude_id: Optional[str] = None):
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(1000)
    for a in admins:
        if a["id"] == exclude_id:
            continue
        await add_notification(a["id"], title, message, type_, related_query_id)


# ---------------- Auth ----------------
@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"employee_id": body.employee_id})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid employee ID or password")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": sanitize_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return sanitize_user(user)


# ---------------- Profile ----------------
@api.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return sanitize_user(user)


@api.put("/profile/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if verify_password(body.new_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="New password cannot be the same as current password")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"message": "Password updated successfully"}


# ---------------- Queries ----------------
@api.post("/queries")
async def create_query(body: QueryIn, user: dict = Depends(get_current_user)):
    q = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": body.title.strip(),
        "description": body.description.strip(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.queries.insert_one(q)
    await notify_admins(
        "New query posted",
        f"{user['name']} ({user['employee_id']}) posted: {q['title']}",
        "new_query",
        related_query_id=q["id"],
        exclude_id=user["id"],
    )
    return await enrich_query(q, user["id"])


@api.get("/queries")
async def list_queries(
    user: dict = Depends(get_current_user),
    filter: str = "all",
    q: str = "",
    page: int = 1,
    limit: int = 5,
):
    now = datetime.now(timezone.utc)
    query = {}
    if filter == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query["created_at"] = {"$gte": start.isoformat()}
    elif filter == "week":
        start = now - timedelta(days=7)
        query["created_at"] = {"$gte": start.isoformat()}
    elif filter == "month":
        start = now - timedelta(days=30)
        query["created_at"] = {"$gte": start.isoformat()}

    # Full-text style search (title/description + author name/employee_id/department)
    search = (q or "").strip()
    if search:
        import re
        pattern = re.compile(re.escape(search), re.IGNORECASE)
        matching_user_ids = [
            u["id"] async for u in db.users.find(
                {"$or": [
                    {"name": {"$regex": pattern}},
                    {"employee_id": {"$regex": pattern}},
                    {"department": {"$regex": pattern}},
                    {"designation": {"$regex": pattern}},
                ]},
                {"_id": 0, "id": 1},
            )
        ]
        query["$or"] = [
            {"title": {"$regex": pattern}},
            {"description": {"$regex": pattern}},
            {"user_id": {"$in": matching_user_ids}},
        ]

    limit = max(1, min(limit, 50))
    page = max(1, page)
    skip = (page - 1) * limit
    total = await db.queries.count_documents(query)
    cursor = db.queries.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)
    enriched = [await enrich_query(qd, user["id"]) for qd in items]
    return {
        "items": enriched,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": skip + len(enriched) < total,
    }


@api.get("/queries/mine")
async def my_queries(user: dict = Depends(get_current_user)):
    cursor = db.queries.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(1000)
    return [await enrich_query(q, user["id"]) for q in items]


@api.put("/queries/{qid}")
async def update_query(qid: str, body: QueryIn, user: dict = Depends(get_current_user)):
    q = await db.queries.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
    if q["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.queries.update_one(
        {"id": qid},
        {"$set": {"title": body.title.strip(), "description": body.description.strip(), "updated_at": now_iso()}}
    )
    if user["role"] == "admin" and q["user_id"] != user["id"]:
        await add_notification(q["user_id"], "Query updated by admin", f"Your query '{body.title}' was updated by an admin.", "query_updated", qid)
    q = await db.queries.find_one({"id": qid}, {"_id": 0})
    return await enrich_query(q, user["id"])


@api.delete("/queries/{qid}")
async def delete_query(qid: str, user: dict = Depends(get_current_user)):
    q = await db.queries.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
    if q["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.queries.delete_one({"id": qid})
    await db.votes.delete_many({"query_id": qid})
    if user["role"] == "admin" and q["user_id"] != user["id"]:
        await add_notification(q["user_id"], "Query removed by admin", f"Your query '{q['title']}' was removed by an admin.", "query_deleted")
    else:
        await notify_admins("Query deleted", f"{user['name']} deleted query '{q['title']}'", "query_deleted", exclude_id=user["id"])
    return {"message": "Query deleted"}


# ---------------- Votes ----------------
@api.post("/queries/{qid}/vote")
async def vote(qid: str, body: VoteIn, user: dict = Depends(get_current_user)):
    q = await db.queries.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
    existing = await db.votes.find_one({"query_id": qid, "user_id": user["id"]}, {"_id": 0})
    if existing and existing["vote_type"] == body.vote_type:
        # Toggle off (remove vote)
        await db.votes.delete_one({"query_id": qid, "user_id": user["id"]})
    elif existing:
        await db.votes.update_one({"query_id": qid, "user_id": user["id"]}, {"$set": {"vote_type": body.vote_type}})
    else:
        await db.votes.insert_one({
            "id": str(uuid.uuid4()),
            "query_id": qid,
            "user_id": user["id"],
            "vote_type": body.vote_type,
            "created_at": now_iso(),
        })
    # Notify author (not self)
    if q["user_id"] != user["id"] and not (existing and existing["vote_type"] == body.vote_type):
        verb = "agreed with" if body.vote_type == "agree" else "disagreed with"
        await add_notification(
            q["user_id"],
            f"Someone {verb} your query",
            f"{user['name']} {verb} '{q['title']}'",
            f"vote_{body.vote_type}",
            related_query_id=qid,
        )
        # High engagement notification to admins
        votes_count = await db.votes.count_documents({"query_id": qid})
        if votes_count in (10, 25, 50, 100):
            await notify_admins(
                "High engagement on query",
                f"'{q['title']}' has reached {votes_count} reactions.",
                "high_engagement",
                related_query_id=qid,
            )
    return await enrich_query(q, user["id"])


# ---------------- Notifications ----------------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find(
        {"recipient_user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    unread = sum(1 for n in items if not n["is_read"])
    return {"items": items, "unread_count": unread}


@api.put("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": nid, "recipient_user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}


@api.put("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"recipient_user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}


@api.delete("/notifications/{nid}")
async def delete_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.delete_one({"id": nid, "recipient_user_id": user["id"]})
    return {"message": "Deleted"}


# ---------------- Dashboard ----------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    total_posted = await db.queries.count_documents({"user_id": user["id"]})
    my_query_ids = [q["id"] async for q in db.queries.find({"user_id": user["id"]}, {"_id": 0, "id": 1})]
    total_engagement = await db.votes.count_documents({"query_id": {"$in": my_query_ids}}) if my_query_ids else 0
    return {"total_posted": total_posted, "total_engagement": total_engagement}


# ---------------- Admin ----------------
@api.get("/admin/employees")
async def admin_list_employees(user: dict = Depends(require_admin)):
    users = await db.users.find({"role": "employee"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users


@api.post("/admin/employees")
async def admin_create_employee(body: EmployeeIn, user: dict = Depends(require_admin)):
    if await db.users.find_one({"employee_id": body.employee_id}):
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "employee_id": body.employee_id,
        "name": body.name,
        "email": body.email,
        "department": body.department,
        "designation": body.designation,
        "password_hash": hash_password(body.password),
        "role": "employee",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await notify_admins(
        "New employee created",
        f"{body.name} ({body.employee_id}) was added to the platform.",
        "new_employee",
        exclude_id=user["id"],
    )
    return sanitize_user(doc)


@api.put("/admin/employees/{uid}")
async def admin_update_employee(uid: str, body: EmployeeUpdateIn, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target or target["role"] != "employee":
        raise HTTPException(status_code=404, detail="Employee not found")
    update = body.model_dump(exclude_none=True)
    if update:
        await db.users.update_one({"id": uid}, {"$set": update})
    updated = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return updated


@api.delete("/admin/employees/{uid}")
async def admin_delete_employee(uid: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target or target["role"] != "employee":
        raise HTTPException(status_code=404, detail="Employee not found")
    await db.users.delete_one({"id": uid})
    # Cascade delete queries & votes by user
    q_ids = [q["id"] async for q in db.queries.find({"user_id": uid}, {"_id": 0, "id": 1})]
    if q_ids:
        await db.queries.delete_many({"user_id": uid})
        await db.votes.delete_many({"query_id": {"$in": q_ids}})
    await db.votes.delete_many({"user_id": uid})
    return {"message": "Employee deleted"}


@api.get("/admin/queries")
async def admin_list_queries(user: dict = Depends(require_admin)):
    items = await db.queries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [await enrich_query(q, user["id"]) for q in items]


@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    return {
        "total_employees": await db.users.count_documents({"role": "employee"}),
        "total_queries": await db.queries.count_documents({}),
        "total_votes": await db.votes.count_documents({}),
    }


# ---------------- Register + CORS ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown():
    client.close()
