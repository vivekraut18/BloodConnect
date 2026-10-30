# BloodConnect 2.0 — Supabase Migration Audit Report

**Date:** September 30, 2026  
**Project:** BloodConnect 2.0  
**Target Architecture:** Supabase PostgreSQL + Supabase Auth + Next.js 15 (App Router)

---

## 1. Executive Summary

This audit evaluates the existing BloodConnect 2.0 codebase to map out a complete migration from MongoDB/Mongoose & custom JWT auth to **Supabase PostgreSQL** and **Supabase Auth**.

No application code or database files were modified during this phase.

---

## 2. Current Architecture Overview

- **Framework:** Next.js `15.5.18` (App Router, React 19)
- **Styling:** Tailwind CSS 3.4
- **Database:** MongoDB via Mongoose `9.10.0`
- **Authentication:** Custom JWT signed with `jsonwebtoken` + Edge Web Crypto helper (`jwt-edge.ts`) stored in `bc_token` httpOnly cookie + `bcryptjs` password hashing.
- **Route Protection:** Next.js middleware (`src/middleware.ts`) enforcing token checks on `/api/*` routes.
- **API Architecture:** Next.js Route Handlers (`src/app/api/...`) with custom JSON response helper (`src/lib/api-response.ts`) and Zod validations (`src/lib/validations.ts`).

---

## 3. Audit Findings — Categorized File Inventory

### A. MongoDB Connection & Model Files (To Be Replaced/Removed)
1. `src/lib/db.ts` — Mongoose singleton connection manager (`mongoose.connect(MONGODB_URI)`).
2. `src/models/User.ts` — Mongoose User model schema.
3. `src/models/Donor.ts` — Mongoose Donor profile model schema (`userId` ref).
4. `src/models/BloodBank.ts` — Mongoose BloodBank model schema (with nested Stock map).
5. `src/models/BloodRequest.ts` — Mongoose BloodRequest model schema (`requesterId` ref).
6. `src/models/Donation.ts` — Mongoose Donation model schema (`donorId` ref).
7. `src/models/index.ts` — Model barrel re-exporting Mongoose models.

### B. MongoDB API Routes & Database Queries (To Be Updated to Supabase Client)
1. `src/app/api/auth/register/route.ts` — Creates User & Donor records.
2. `src/app/api/auth/login/route.ts` — Queries User by email, checks password hash.
3. `src/app/api/auth/me/route.ts` — Queries User by `userId`.
4. `src/app/api/blood-banks/route.ts` — Seeds default banks, queries banks by city/stock.
5. `src/app/api/blood-banks/[id]/route.ts` — Queries single bank by ID.
6. `src/app/api/dashboard/donor-stats/route.ts` — Calculates stats using Donor & Donation collections.
7. `src/app/api/donations/route.ts` — Queries & inserts donation records.
8. `src/app/api/donors/route.ts` — Queries donors populated with user info.
9. `src/app/api/donors/[id]/route.ts` — Queries individual donor detail & enforces PII access rules.
10. `src/app/api/donors/[id]/availability/route.ts` — Updates donor availability status.
11. `src/app/api/requests/route.ts` — Creates blood requests, queries compatible donors, paginates role-scoped requests.
12. `src/app/api/requests/[id]/status/route.ts` — Updates request status with state transition validations.

### C. Authentication & Security Logic (To Be Replaced with Supabase Auth)
1. `src/lib/auth.ts` — Custom JWT signing, bcrypt password hashing, and cookie management.
2. `src/lib/jwt-edge.ts` — Edge Web Crypto JWT verification helper for middleware.
3. `src/middleware.ts` — Next.js Middleware parsing JWTs from cookies/headers.
4. `src/app/api/auth/logout/route.ts` — Clears `bc_token` cookie.
5. `src/app/components/LoginForm.tsx` — Login form triggering sign-in.
6. `src/app/components/RegisterForm.tsx` — Registration form (currently has mock timeout, needs Supabase Auth signup connection).

### D. Environment Variables (To Be Updated)
- **Remove Obsolete:**
  - `MONGODB_URI`
  - `JWT_SECRET`
- **Add Required Supabase Keys:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (Server-only)

### E. Scripts & Test Files (To Be Replaced or Removed)
1. `scripts/seed-demo-data.ts` — Uses `mongoose` and MongoDB `db.collection()` directly. Must be replaced with a Supabase SQL or TS seed script.
2. `scripts/test-security.ts` — Tests JWT_SECRET throwing & rate limit logic. Needs update for Supabase auth verification.

### F. Preserved Core Application Logic & Components
1. `src/lib/validations.ts` — Zod schemas, blood group compatibility rules, status state transitions (`isValidStatusTransition`).
2. `src/lib/api-response.ts` — Standardized API response format helpers (`successResponse`, `errorResponse`).
3. `src/lib/rate-limit.ts` — In-memory rate limiting utility.
4. `src/lib/constants.ts` — Business constants (Blood groups, priorities, hospital types).
5. UI Layout & Page Components: `Topbar.tsx`, `Sidebar.tsx`, `AppLayout.tsx`, `DonorDashboardContent.tsx`, `FindBloodSearch.tsx`, `NearbyRequestsFeed.tsx`, `DonationHistoryTable.tsx`, `DonorResults.tsx`, `BloodBankResults.tsx`, etc.

### G. Unused Dependencies to Remove Post-Migration
- `mongoose`
- `bcrypt` / `@types/bcrypt`
- `bcryptjs` / `@types/bcryptjs`
- `jsonwebtoken` / `@types/jsonwebtoken`

### H. Known Issues & Asset Fixes
- `src/components/ui/AppLogo.tsx` references `/assets/images/app_logo.png`, which is missing. Main image in repository is `/assets/images/app.png`.
- `README.md` contains git merge conflict markers (`<<<<<<<`, `>>>>>>>`) on lines 92–95.

---

## 4. Proposed Supabase PostgreSQL Schema & RLS Plan

```sql
-- 1. Enum Types
CREATE TYPE user_role AS ENUM ('donor', 'requester', 'hospital', 'admin');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'suspended', 'rejected');
CREATE TYPE donor_availability AS ENUM ('available', 'temporarily_unavailable', 'do_not_disturb');
CREATE TYPE request_priority AS ENUM ('EMERGENCY', 'URGENT', 'STANDARD');
CREATE TYPE request_status AS ENUM ('OPEN', 'MATCHING', 'DONOR_RESPONDED', 'HOSPITAL_CONFIRMED', 'FULFILLED', 'CANCELLED', 'EXPIRED');
CREATE TYPE donation_status AS ENUM ('scheduled', 'arrived', 'completed', 'cancelled', 'no_show');
CREATE TYPE inventory_status AS ENUM ('available', 'low', 'critical', 'out_of_stock');

-- 2. Users Table (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'donor',
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  verification_status verification_status NOT NULL DEFAULT 'verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Donor Profiles
CREATE TABLE public.donor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL,
  availability_status donor_availability NOT NULL DEFAULT 'available',
  last_donation_date TIMESTAMPTZ,
  donations_completed INT NOT NULL DEFAULT 0,
  reliability_score INT NOT NULL DEFAULT 100 CHECK (reliability_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Blood Banks & Inventory
CREATE TABLE public.blood_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  contact TEXT NOT NULL,
  phone TEXT,
  operating_hours TEXT DEFAULT '24/7 Service',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.blood_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_bank_id UUID NOT NULL REFERENCES public.blood_banks(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL,
  units INT NOT NULL DEFAULT 0 CHECK (units >= 0),
  status inventory_status NOT NULL DEFAULT 'available',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blood_bank_id, blood_group)
);

-- 5. Blood Requests
CREATE TABLE public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  blood_group TEXT NOT NULL,
  priority request_priority NOT NULL DEFAULT 'STANDARD',
  status request_status NOT NULL DEFAULT 'OPEN',
  hospital TEXT NOT NULL,
  units_needed INT NOT NULL CHECK (units_needed >= 1),
  contact_number TEXT NOT NULL,
  patient_name TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Donations
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id TEXT UNIQUE NOT NULL,
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_bank_id UUID REFERENCES public.blood_banks(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status donation_status NOT NULL DEFAULT 'scheduled',
  units INT NOT NULL DEFAULT 1 CHECK (units >= 1),
  hospital TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Summary of Next Steps for Subsequent Phases

1. Create Supabase client files in `src/lib/supabase/` (`client.ts`, `server.ts`, `admin.ts`).
2. Run SQL migration script to set up tables, triggers, and Row Level Security (RLS).
3. Replace JWT/Mongoose API routes with Supabase SDK database calls and Supabase Auth.
4. Update frontend auth handlers (`LoginForm.tsx` & `RegisterForm.tsx`).
5. Fix broken image path reference in `AppLogo.tsx`.
6. Remove obsolete MongoDB/Mongoose packages and files.
7. Run `npm run build` and end-to-end testing to verify full functionality.
