# APDCL Connect – PRD

## Original Problem Statement
Build a full-stack Employee Engagement & Communication Platform for APDCL — clean professional enterprise UI (deep navy sidebar + orange accents), employee & admin roles, queries with agree/disagree votes, in-app notifications, profile with password change, admin employee & query management.

## Tech (adapted for Emergent environment)
- **Backend**: FastAPI + MongoDB (Motor)
- **Frontend**: React + Tailwind + shadcn/ui
- **Auth**: JWT (Bearer token in localStorage) + bcrypt
- **State**: React Context

## Personas
- **Employee**: posts queries, agrees/disagrees on others, sees own dashboard & notifications
- **Admin**: manages employees, moderates queries, sees platform-wide activity

## Core Requirements (static)
- Login by Employee ID + password (role-based redirect)
- Sidebar: Dashboard / Company Query / Post Query / Profile / Logout (+ Admin sections for admin role)
- Top bar: date, time, notification bell w/ unread count, user chip
- Dashboard: welcome hero + stats + own recent queries
- Company Query: all queries, agree/disagree, filters (All/Today/Week/Month), one vote per user, changeable
- Post Query: form + only self queries with edit/delete
- Profile: personal info card (readonly) + change password card
- Notifications: DB-based, mark read / mark all / delete
- Admin: view/add/edit/delete employees, view/delete queries

## Implemented (2026-02)
- Full backend API (auth, profile, queries, votes, notifications, admin, dashboard stats)
- Seed admin + 4 sample employees + 3 sample queries on startup
- Full frontend: Login, Dashboard, Company Query, Post Query, Profile, Admin (Employees, Queries)
- Responsive layout, protected routes, notifications dropdown

## Not implemented (per spec: DO NOT include)
Chat, video, AI, comments, file upload, polls, dark mode, charts, push/email/SMS, websockets.

## Next Action Items
- P1: Profile photo upload (currently avatar with initials only)
- P2: Pagination on Company Query when list grows
- P2: Query search
