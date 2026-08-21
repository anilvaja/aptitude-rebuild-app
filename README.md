# Aptitude — Modern Online Assessment & Examination Platform

A production-grade, containerized online assessment platform built with **Node.js/Express**, **React (Vite)**, **PostgreSQL** via **Prisma ORM**, and **Docker Compose**.

Designed for both **Enterprise Professional Certifications** (e.g., Anthropic Claude Certified Architect) and **K-12 Primary School Assessments** (Class 1 & Class 2), featuring server-enforced countdown clocks, negative marking calibration, hierarchical taxonomies, visual diagram questions, and strict grade-based access control.

---

## Key Platform Features

### 1. Separate & Role-Segregated Portals (Admin vs Student)
* **Platform Administrator Console (`/admin`)**:
  * Distinct dark slate header with administrative navigation: `📊 Overview Dashboard`, `📝 Question Bank`, `🎓 Examination Papers`, `👥 Students Roster`, `✍️ Review Queue`, `👤 My Profile`.
* **Candidate Assessment Portal (`/`)**:
  * Clean indigo header displaying assigned grade badge (`🎒 Primary Grade 2` or `💼 Professional Candidate`), with student navigation: `📚 Available Tests`, `📜 Test History`, `👤 My Profile`.

### 2. User & Student Profile Management & Self-Service (`/profile`)
* **Dedicated Account Settings Page (`/profile`)**:
  * All users (Students and Administrators) can review their profile details, update their Name, Age, Education, School/Company, and Experience.
  * **Change Password**: In-app secure password change with verification of current password and instant confirmation.

### 3. Student Roster Management & Admin Password Reset (`/admin/users`)
* **Edit Student Profile**: Admins can edit any student's Name, Email, Grade/Track, Age, Experience, Education, School/Company, and Active/Inactive status in a modal dialog.
* **Reset Student Password**: Admins can reset a candidate's password directly using a custom password or the **`🎲 Generate Random Password`** tool with one-click copy.
* **Bulk Enrollment Engine (Excel & CSV)**: Upload `.xlsx` or `.csv` spreadsheets to enroll complete student cohorts with automatic password hashing.
* **Downloadable Sample Templates**: Includes pre-formatted `sample_students_template.xlsx` and `sample_students_template.csv`.

### 4. Image & Diagram Questions Support
* **Rich Visual Questions**: Full support for diagrams, flowcharts, geometric shapes, clocks, bar charts, and technical architectures in question banks.
* **Authoring Tools (`/admin/questions`)**:
  * Add external Image URLs or upload local image files directly (auto-converted to optimized assets).
  * Live visual preview box and optional figure captions (e.g., `Figure 1: ReAct Loop State Diagram`).
* **Live Test Runner & Result Review**: Diagrams render seamlessly above question options in both the timed examination hall (`/runner/:id`) and post-test review (`/result/:id`).

### 5. Enterprise Certification Suite: Claude Certified Architect (CCAR-F)
* **240+ Official Blueprint Scenario Questions** distributed across **4 Full Practice Exams** (60 Questions each):
  * **Exam 1:** *Full Official Practice Exam* (Foundation blueprints, ReAct mechanics, tool calling, prompt caching)
  * **Exam 2:** *Advanced Scenario Practice Exam* (Circuit breakers, vision loops, Temporal checkpoints, Message Batches)
  * **Exam 3:** *Production Architecture & Security* (HITL state machines, canary tokens, container egress sandboxes)
  * **Exam 4:** *Enterprise Solutions & Deep Diagnostics* (HIPAA PHI proxies, Dynamic Tool Selection, Mutation testing)
* **Official Blueprint Alignment:** 90-minute exam hall timer, 72% pass mark, +1.0 mark / -0.25 negative marking penalty.

### 6. Primary School Assessments (Class 1 & Class 2)
* **50-50 Balanced Syllabus:** 50% Mathematics (Geometry, Place Value, Multiplication, Clocks, Fractions) + 50% English (Phonics, Nouns, Reading).
* **Child-Friendly Visual Interface:** Dedicated primary school hub, no negative marking, and age-calibrated question sets with vector illustrations.

### 7. Strict Grade & Profile-Based Eligibility Control
* **Bidirectional Grade Isolation:** Students only see assessment papers assigned to their enrolled grade/tier:
  * **Primary School Students (e.g., Grade 2):** Only see Class 2 assessments; CCAR-F exams and other grades are filtered out.
  * **IT Professionals / Masters Candidates:** Only see Professional Architecture certifications; primary school papers are filtered out.
* **Administrator-Managed Enrollment:** Direct self-registration is disabled. All student accounts, grades, ages, and school affiliations are enrolled and managed by administrators.

### 8. Background Active Test Tracking & Single Active Test Lock
* **Sticky Live Timer Banner:** Persistent countdown bar across all application pages when a test is running.
* **Concurrent Test Prevention:** Blocks concurrent attempts with `HTTP 409 Conflict` until active attempts are finalized.

### 9. Question Bank 2-Column Hierarchy (`/admin/questions`)
* **Left Sidebar Tree:** Expandable Parent Categories (`📂`) with indented Child Subcategories (`🔹`) and live question counters.
* **Excel & CSV Bulk Import Engine:** Upload `.xlsx` or `.csv` files to import questions with diagram URLs and figure captions. Downloadable official sample templates (`.xlsx` & `.csv`).

### 10. Weightage & Blueprint Question Auto-Generator (`/admin/tests`)
* **Dynamic Percentage Allocations**: Admins can specify target total question counts and distribute percentages across subjects, parent categories, child subcategories, and difficulty levels (e.g. Mathematics 30%, English 30%, Claude Architecture 40%).
* **Live 100% Validation Guard**: The auto-generator enforces that weightage rules sum to exactly 100%. The generation action is strictly locked and disabled until 100% is reached.
* **Anti-Cheat Random Sampling**: Uses Fisher-Yates shuffle to sample and draw non-duplicate questions matching the calculated quota per domain with one-click re-shuffling.

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
docker compose exec backend node prisma/seed.js
docker compose exec backend node prisma/seed_ccarf_exam2.js
docker compose exec backend node prisma/seed_ccarf_exam3.js
docker compose exec backend node prisma/seed_ccarf_exam4.js
docker compose exec backend node prisma/seed_math_image_questions.js
```

### 4. Access Platform
* **Web UI (Frontend):** [http://localhost:8080](http://localhost:8080)
* **REST API (Backend):** [http://localhost:4000](http://localhost:4000)
