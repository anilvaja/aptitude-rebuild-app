# Aptitude — Modern Online Assessment & Examination Platform

A production-grade, containerized online assessment platform built with **Node.js/Express**, **React (Vite)**, **PostgreSQL** via **Prisma ORM**, and **Docker Compose**.

Designed for both **Enterprise Professional Certifications** (e.g., Anthropic Claude Certified Architect) and **K-12 Primary School Assessments** (Class 1 & Class 2), featuring server-enforced countdown clocks, negative marking calibration, hierarchical taxonomies, and strict grade-based access control.

---

## Key Platform Features

### 1. Enterprise Certification Suite: Claude Certified Architect (CCAR-F)
* **240+ Official Blueprint Scenario Questions** distributed across **4 Full Practice Exams** (60 Questions each):
  * **Exam 1:** *Full Official Practice Exam* (Foundation blueprints, ReAct mechanics, tool calling, prompt caching)
  * **Exam 2:** *Advanced Scenario Practice Exam* (Circuit breakers, vision loops, Temporal checkpoints, Message Batches)
  * **Exam 3:** *Production Architecture & Security* (HITL state machines, canary tokens, container egress sandboxes)
  * **Exam 4:** *Enterprise Solutions & Deep Diagnostics* (HIPAA PHI proxies, Dynamic Tool Selection, Mutation testing)
* **Official Blueprint Alignment:** 90-minute exam hall timer, 72% pass mark, +1.0 mark / -0.25 negative marking penalty.

### 2. Primary School Assessments (Class 1 & Class 2)
* **50-50 Balanced Syllabus:** 50% Mathematics (Geometry, Place Value, Multiplication) + 50% English (Phonics, Nouns, Reading).
* **Child-Friendly Visual Interface:** Dedicated primary school hub, no negative marking, and age-calibrated question sets.

### 3. Strict Grade & Profile-Based Eligibility Control
* **Bidirectional Grade Isolation:** Students only see assessment papers assigned to their enrolled grade/tier:
  * **Primary School Students (e.g., Grade 2):** Only see Class 2 assessments; CCAR-F exams and other grades are filtered out.
  * **IT Professionals / Masters Candidates:** Only see Professional Architecture certifications; primary school papers are filtered out.
* **Administrator-Managed Enrollment:** Direct self-registration is disabled. All student accounts, grades, ages, and school affiliations are enrolled and managed by administrators.

### 4. Background Active Test Tracking & Single Active Test Lock
* **Sticky Live Timer Banner:** Persistent countdown bar across all application pages when a test is running.
* **Concurrent Test Prevention:** Blocks concurrent attempts with `HTTP 409 Conflict` until active attempts are finalized.

### 5. Subject › Category › Subcategory Hierarchical Question Bank
* **2-Column Interactive Workspace (`/admin/questions`):**
  * **Left Sidebar Tree:** Expandable Parent Categories (`📂`) with indented Child Subcategories (`🔹`) and live count badges.
  * **Top Action Bar:** Quick modal to create top-level Categories or child Subcategories linked to a parent.
  * **Bulk Import Engine (Excel & CSV):** Upload `.xlsx` or `.csv` files to import hundreds of questions in one click, with auto-category resolution, pre-import preview, and downloadable official sample templates (`.xlsx` & `.csv`).
  * **Rich Question Cards:** Displays Subject > Category > Subcategory breadcrumbs, MCQ choices with the **`✓ Correct Answer`** highlighted in soft green, and collapsible model solutions.

### 6. Student Roster Bulk Import & Enrollment (`/admin/users`)
* **Bulk Import Engine (Excel & CSV):** Upload complete student cohorts from `.xlsx` or `.csv` spreadsheets with names, emails, temporary passwords, academic grades, ages, experience, and school affiliations.
* **Instant Sample Downloads:** Download pre-formatted `sample_students_template.xlsx` and `sample_students_template.csv` directly from the user interface.

### 7. Comprehensive Post-Test Result & Solution Review
* Complete question-by-question review on `/result/:id` showing student choices, correct answers, domain breakdowns, and detailed architectural explanations.

---

## Pre-Configured Accounts

| Account Role | Email Address | Password | Profile / Access Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@aptitude.local` | `Admin@12345` | Full administrative control, student enrollment, question authoring, test builder, and analytics. |
| **Masters / IT Professional** | `Anilvaja.007@gmail.com` | `Admin@123` | **36 yo · 13 yrs IT Exp · M.Sc. IT**<br>Access to all **Claude Certified Architect (CCAR-F) Exams (1, 2, 3, 4)**. |
| **Grade 2 Student** | `Shivansh.vaja@gmail.com` | `1234567890` | **7 yo · Grade 2 · Bright Day School**<br>Access to **Class 2 Combined Mathematics & English Assessments**. |

---

## Quick Start (Docker Compose)

### 1. Clone & Set Up Environment
```bash
cp .env.example .env
```

### 2. Build & Launch Containers
```bash
docker compose up --build -d
```
Verify that `postgres`, `backend` (:4000), and `frontend` (:8080) are running:
```bash
docker compose ps
```

### 3. Seed Database & Question Banks
Run the master database seeder:
```bash
# Seed admin, primary school assessments & CCAR-F exams 1, 2, 3, 4
docker compose exec backend node prisma/seed.js
docker compose exec backend node prisma/seed_ccarf_exam2.js
docker compose exec backend node prisma/seed_ccarf_exam3.js
docker compose exec backend node prisma/seed_class1_class2.js
docker compose exec backend node prisma/seed_users_and_exam4.js
docker compose exec backend node prisma/seed_hierarchy_cleanup.js
docker compose exec backend node prisma/seed_claude_subcats.js
```

### 4. Access the Application
* **Frontend Portal:** [http://localhost:8080](http://localhost:8080)
* **Backend API:** [http://localhost:4000/api](http://localhost:4000/api)
* **Prisma Studio (DB GUI):** `docker compose exec backend npx prisma studio` (open [http://localhost:5555](http://localhost:5555))

---

## Architectural Layout

```
aptitude-rebuild/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Data models (User, Category, Question, Test, Attempt)
│   │   └── seed_*.js                  # Question bank & user seeders (CCAR-F 1-4, Class 1-2)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js                # JWT auth, profile attributes, /me, disabled self-registration
│   │   │   ├── tests.js               # Test catalog with strict grade-level isolation
│   │   │   ├── attempts.js            # Timed attempt runner, auto-submit, 409 active test lock
│   │   │   ├── questions.js           # Question CRUD with subject/subcategory taxonomy
│   │   │   ├── categories.js          # Hierarchical parent-child category management
│   │   │   └── admin.js               # Student directory, grade enrollment & analytics
│   │   ├── middleware/                # Auth verification, RBAC, Zod validation, error handling
│   │   └── server.js                  # Express API server entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── student/
│   │   │   │   ├── TestList.jsx       # Dynamic exam portal tailored for primary vs professional
│   │   │   │   ├── TestRunner.jsx     # Live exam runner with timer and question palette
│   │   │   │   ├── Result.jsx         # Full solution review with answer explanations
│   │   │   │   └── History.jsx        # Historical attempt records & scores
│   │   │   └── admin/
│   │   │       ├── QuestionBank.jsx   # 2-column sidebar hierarchy question manager
│   │   │       ├── TestBuilder.jsx    # Test authoring & question pool selector
│   │   │       ├── Users.jsx          # Student enrollment & profile management
│   │   │       └── Overview.jsx       # Platform analytics & difficulty calibration
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # Persistent authentication & user profile state
│   │   │   └── ActiveTestContext.jsx  # Live background test tracking & countdown ticker
│   │   └── styles/tokens.css          # Design system & color tokens
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Security Invariants

* **Authentication:** Short-lived JWT access tokens (15m) paired with rotating SHA-256 hashed refresh tokens in `httpOnly`, `sameSite=strict` cookies.
* **Passwords:** Salted bcrypt (12 rounds) with constant-time verification.
* **SQL Injection Defense:** 100% parameterized queries via Prisma ORM.
* **Schema Validation:** Strict runtime validation via Zod schemas on all API boundaries.
* **Exam Clock Integrity:** Server-side timestamp reconciliation forces auto-submission upon deadline expiry regardless of client state.
* **Brute-Force Throttling:** Rate limiting on authentication routes (10 attempts / 15 mins).
