# AYURCARE — Browser Demo & Testing Guide

A step-by-step walkthrough to run the app locally, seed sample data, and test every screen.

---

## 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Two databases created:

```sql
CREATE DATABASE ayurcare;
CREATE DATABASE ayurcare_test;
```

---

## 2. Environment Setup

Create a `.env` file in the project root (or export these in your shell):

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ayurcare
DB_USER=postgres
DB_PASSWORD=your_password
SESSION_SECRET=ayurcare-local-secret
PORT=3000
```

---

## 3. Install & Start

```bash
npm install
node server/server.js
```

Open your browser at: **http://localhost:3000**

---

## 4. Seed the Database

Run this SQL in psql or any PostgreSQL client against the `ayurcare` database.

### 4.1 Create Schema

```bash
psql -U postgres -d ayurcare -f server/schema.sql
```

### 4.2 Seed Sample Users

```sql
-- Admin user (password: Admin@123)
INSERT INTO users (name, email, password, role) VALUES
  ('Dr. Priya Sharma', 'admin@ayurcare.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Client users (password: Client@123)
INSERT INTO users (name, email, password, role) VALUES
  ('Arjun Mehta',   'arjun@example.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client'),
  ('Sneha Patel',   'sneha@example.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client'),
  ('Rahul Verma',   'rahul@example.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client');
```

> Note: The hash above is bcrypt of `password` (the default test password from the jest helpers).
> To use real passwords, register via the UI instead — see Section 5.

### 4.3 Seed Prakriti Results

```sql
-- Arjun: Vata dominant (approved)
INSERT INTO prakriti_results (user_id, vata_score, pitta_score, kapha_score, dominant_type, status, approved_by, approved_at)
VALUES (2, 38, 18, 10, 'vata', 'approved', 1, NOW());

-- Sneha: Pitta dominant (pending — admin needs to approve)
INSERT INTO prakriti_results (user_id, vata_score, pitta_score, kapha_score, dominant_type, status)
VALUES (3, 12, 36, 16, 'pitta', 'pending');

-- Rahul: Kapha dominant (approved)
INSERT INTO prakriti_results (user_id, vata_score, pitta_score, kapha_score, dominant_type, status, approved_by, approved_at)
VALUES (4, 10, 14, 40, 'kapha', 'approved', 1, NOW());
```

### 4.4 Seed Diet Recommendations

```sql
-- Arjun's Vata diet plan
INSERT INTO diet_recommendations (prakriti_type, recommended_foods, avoid_foods, lifestyle_tips, customized_for, customized_by, customized_at)
VALUES (
  'vata',
  'Warm, cooked, oily foods. Ghee, sesame oil, warm milk, rice, oats, sweet potato, banana, mango, almonds, ginger, cinnamon.',
  'Cold drinks, raw salads, dry crackers, carbonated beverages, frozen foods, excessive caffeine.',
  'Eat at regular times. Prefer warm beverages. Avoid skipping meals. Daily sesame oil massage recommended.',
  2, 1, NOW()
);

-- Rahul's Kapha diet plan
INSERT INTO diet_recommendations (prakriti_type, recommended_foods, avoid_foods, lifestyle_tips, customized_for, customized_by, customized_at)
VALUES (
  'kapha',
  'Light, dry, warm foods. Barley, millet, lentils, leafy greens, apples, pears, ginger, black pepper, turmeric.',
  'Wheat, dairy (cheese, ice cream), fried foods, sweets, cold drinks, bananas, avocados.',
  'Largest meal at midday. Avoid daytime napping. Regular vigorous exercise. Use warming spices liberally.',
  4, 1, NOW()
);
```

### 4.5 Seed Yoga Sessions

```sql
INSERT INTO yoga_sessions (title, category, description, therapist_name) VALUES
  ('Surya Namaskar — Morning Flow',   'morning',     'A 12-pose sun salutation sequence to energise the body at dawn.', 'Dr. Priya Sharma'),
  ('Pranayama Breathing Basics',      'breathing',   'Nadi Shodhana and Bhramari techniques for calming the nervous system.', 'Dr. Priya Sharma'),
  ('Restorative Yin Yoga',            'restorative', 'Slow, floor-based poses held for 3–5 minutes to release deep tension.', 'Dr. Priya Sharma'),
  ('Vata Balancing Sequence',         'dosha',       'Grounding poses — Tadasana, Virabhadrasana, Balasana — for Vata types.', 'Dr. Priya Sharma'),
  ('Pitta Cooling Flow',              'dosha',       'Cooling forward folds and twists to pacify excess Pitta heat.', 'Dr. Priya Sharma'),
  ('Kapha Energising Practice',       'dosha',       'Dynamic standing poses and backbends to stimulate sluggish Kapha energy.', 'Dr. Priya Sharma');
```

### 4.6 Seed Yoga Assignments

```sql
-- Arjun assigned to Vata Balancing Sequence (session id 4)
INSERT INTO yoga_plan_assignments (user_id, yoga_session_id, progress_notes)
VALUES (2, 4, 'Completed 3 sessions. Feeling more grounded.');

-- Rahul assigned to Kapha Energising Practice (session id 6)
INSERT INTO yoga_plan_assignments (user_id, yoga_session_id)
VALUES (4, 6);
```

### 4.7 Seed Subscriptions

```sql
INSERT INTO subscriptions (user_id, plan_name, valid_from, valid_until, payment_status) VALUES
  (2, 'Premium',  '2026-01-01', '2026-12-31', 'paid'),
  (3, 'Basic',    '2026-01-01', '2026-03-20', 'paid'),   -- expires soon → renewal reminder
  (4, 'Premium',  '2025-06-01', '2026-06-01', 'paid');
```

### 4.8 Seed Notifications

```sql
INSERT INTO notifications (user_id, message, is_read) VALUES
  (2, 'Your Prakriti assessment has been approved. Your dominant type is vata.', false),
  (2, 'Your diet plan has been customized by your practitioner.', false),
  (3, 'Your Prakriti assessment is under review. Please wait for approval.', false),
  (4, 'Your Prakriti assessment has been approved. Your dominant type is kapha.', true);
```

---

## 5. Screen-by-Screen Walkthrough

### 5.1 Landing Page — http://localhost:3000

**What you see:**
- AYURCARE header with Login / Sign Up buttons
- Hero section: "Ancient Wisdom, Modern Wellness"
- Feature cards: Prakriti Assessment, Personalised Diet, Yoga Therapy, Progress Tracking

**Actions to try:**
- Click **Sign Up** → goes to `/signup.html`
- Click **Login** → goes to `/login.html`

---

### 5.2 Sign Up — http://localhost:3000/signup.html

**Fill in:**
```
Full Name:  Kavya Nair
Email:      kavya@example.com
Password:   TestPass123!
```

**What happens:**
- POST /api/register creates the user with role=client
- Redirects to `/dashboards/patientDashboard.html`
- Session cookie is set

**Error to test:**
- Submit with the same email again → red banner: "Email already registered"
- Submit with empty fields → red banner: "Name, email, and password are required"

---

### 5.3 Login — http://localhost:3000/login.html

**Client login:**
```
Email:    arjun@example.com
Password: TestPass123!
```
→ Redirects to `/dashboards/patientDashboard.html`

**Admin login:**
```
Email:    admin@ayurcare.com
Password: TestPass123!
```
→ Redirects to `/dashboards/adminDashboard.html`

**Error to test:**
- Wrong password → "Invalid email or password"
- Unknown email → "Invalid email or password"

---

### 5.4 Client Dashboard — /dashboards/patientDashboard.html

**What you see after logging in as Arjun:**
- Welcome, Arjun Mehta
- Summary cards:
  - Notifications: **2** unread
  - Prakriti Status: **approved**
- Sidebar links: Dashboard, View Account, Notifications, Prakriti Assessment, Diet Plan, Yoga Sessions, Plans & Payment

**View Account section:**
- Click **View Account** in sidebar
- See: Name = Arjun Mehta, Email = arjun@example.com, Role = client
- Edit name → type "Arjun K. Mehta" → Save Changes → success banner appears

**Notifications section:**
- Click **Notifications** in sidebar
- See 2 unread messages listed newest first:
  1. "Your diet plan has been customized by your practitioner."
  2. "Your Prakriti assessment has been approved. Your dominant type is vata."
- Click a notification → it marks as read (bold styling removed)

---

### 5.5 Prakriti Assessment — /dashboards/prakritiTest.html

**Login as Kavya (newly registered, no result yet)**

**What you see:**
- 25 questions, one per section
- Each question has 3 radio options (a/b/c)

**Sample answers to get a Vata result:**
- Answer **a** for all 25 questions

**Submit:**
- All 25 answered → POST /api/prakriti/submit
- Result card appears: Vata 50 | Pitta 0 | Kapha 0 | Dominant: **VATA** | Status: pending

**Error to test:**
- Skip any question and submit → "Please answer all 25 questions" validation message

---

### 5.6 Diet Plan — /dashboards/dietPlan.html

**Login as Arjun (has approved Prakriti)**

**What you see:**
- Diet plan card for Vata type
- Recommended Foods: "Warm, cooked, oily foods. Ghee, sesame oil..."
- Avoid Foods: "Cold drinks, raw salads..."
- Lifestyle Tips: "Eat at regular times..."

**Login as Kavya (pending Prakriti — no approved result)**
- Click "Generate My Diet Plan"
- Error: "Complete Prakriti assessment first" (422)

---

### 5.7 Yoga Sessions — /dashboards/yogaSessions.html

**Login as Arjun**

**What you see:**
- Session list grouped by category:
  - morning: Surya Namaskar — Morning Flow
  - breathing: Pranayama Breathing Basics
  - restorative: Restorative Yin Yoga
  - dosha: Vata Balancing Sequence, Pitta Cooling Flow, Kapha Energising Practice
- Arjun's assigned plan: "Vata Balancing Sequence" with progress note

**Assign a new session:**
- Click **Assign** on "Pranayama Breathing Basics"
- It appears in "My Assigned Plan" section

**Log progress:**
- In assigned plan, type: "Completed 2 sessions. Breathing feels calmer."
- Click Save → progress note updates

---

### 5.8 Plans & Payment — /dashboards/plans.html

**Login as Arjun**

**What you see:**
- Plan card: Premium | Valid: 2026-01-01 → 2026-12-31 | Status: **active** | Paid

**Login as Sneha**
- Plan card: Basic | Valid until: 2026-03-20 | Status: **active** | ⚠ Renewal reminder (within 7 days of expiry)

---

## 6. Admin Screens

### 6.1 Admin Dashboard — /dashboards/adminDashboard.html

**Login as admin@ayurcare.com**

**What you see:**
- Pending Assessments: **1** (Sneha's pitta result)
- Unassigned Plans: **1** (Sneha has no yoga assignment)
- Sidebar: Dashboard, Client Management, Prakriti Management, Diet Management, Yoga Management, Case History & Reports, Analytics

---

### 6.2 Client Management — /dashboards/clientManagement.html

**What you see:**
- Client list table:

| Name         | Email                | Joined      | Actions |
|--------------|----------------------|-------------|---------|
| Arjun Mehta  | arjun@example.com    | 2026-03-15  | View    |
| Rahul Verma  | rahul@example.com    | 2026-03-15  | View    |
| Sneha Patel  | sneha@example.com    | 2026-03-15  | View    |

**Search:**
- Type "arj" in search bar → filters to Arjun only

**View client detail (click View on Arjun):**
- Profile: Arjun Mehta, arjun@example.com
- Prakriti Results: vata, approved
- Diet Plan: Vata template
- Yoga Assignments: Vata Balancing Sequence
- Notifications: 2 entries

**Pending Prakriti section:**
- Sneha Patel | pitta | pending
- Click **Approve** → status changes to approved, notification sent to Sneha
- Click **Modify** → inline form appears:
  ```
  Vata Score:  14
  Pitta Score: 34
  Kapha Score: 16
  ```
  Save → dominant_type recomputed, approved_by and approved_at recorded

---

### 6.3 Diet Management — /dashboards/dietManagement.html

**What you see:**
- Client list with their most recent diet plan
- Arjun: Vata plan, customized 2026-03-15
- Rahul: Kapha plan, customized 2026-03-15
- Sneha: No plan yet

**Customize Arjun's diet:**
- Click Edit on Arjun's plan
- Update Recommended Foods:
  ```
  Add: Warm soups, cooked lentils, dates, warm herbal teas (tulsi, ashwagandha).
  ```
- Save → PATCH /api/admin/diet/:id/customize
- Notification sent to Arjun: "Your diet plan has been customized by your practitioner."

---

### 6.4 Yoga Management — /dashboards/yogaManagement.html

**What you see:**
- All 6 yoga sessions listed

**Upload new session:**
```
Title:          Nidra Yoga — Deep Relaxation
Category:       restorative
Description:    A guided body-scan relaxation practice for deep rest and stress relief.
Therapist:      Dr. Priya Sharma
Video Link:     https://youtube.com/watch?v=example
```
- POST /api/admin/yoga/upload → new session appears in list

**Edit existing session:**
- Click Edit on "Surya Namaskar"
- Change description → PATCH /api/admin/yoga/session/1

---

### 6.5 Case History & Reports — /dashboards/analytics.html

**Charts (top of page):**
- Prakriti Distribution doughnut: Vata 1, Pitta 0, Kapha 1 (only approved count)
- Daily Assessments bar chart: shows today's submissions
- Active Users line chart: shows today's activity

**Filter & Report table:**

Apply these filters:
```
Start Date:    2026-01-01
End Date:      2026-12-31
Prakriti Type: vata
Plan Type:     (leave blank)
```
Click **Apply Filters**

Result row:
| Client     | Email             | Prakriti | Status   | Date       | Diet Plan       | Yoga | Plan    |
|------------|-------------------|----------|----------|------------|-----------------|------|---------|
| Arjun Mehta| arjun@example.com | vata     | approved | 2026-03-15 | Warm, cooked... | 1    | Premium |

**Export CSV:**
- Click **Export CSV** with same filters
- Browser downloads `ayurcare-report.csv`

---

## 7. API Quick Reference

All endpoints require an active session cookie (login first via browser or curl).

### Auth
| Method | Endpoint        | Body                              | Response              |
|--------|-----------------|-----------------------------------|-----------------------|
| POST   | /api/register   | `{name, email, password}`         | `{redirect}`          |
| POST   | /api/login      | `{email, password}`               | `{redirect}`          |
| POST   | /api/logout     | —                                 | `{message}`           |

### Client
| Method | Endpoint                            | Notes                        |
|--------|-------------------------------------|------------------------------|
| GET    | /api/client/dashboard               | name + unread count          |
| GET    | /api/client/profile                 | full user object             |
| PATCH  | /api/client/profile                 | `{name}`                     |
| GET    | /api/client/notifications           | array, newest first          |
| PATCH  | /api/client/notifications/:id/read  | marks is_read=true           |
| GET    | /api/client/plans                   | subscriptions + status       |

### Prakriti
| Method | Endpoint                    | Notes                              |
|--------|-----------------------------|------------------------------------|
| POST   | /api/prakriti/submit        | `{answers: {"1":"a", ...}}`        |
| GET    | /api/prakriti/result        | most recent result for client      |
| PATCH  | /api/prakriti/:id/approve   | admin only                         |

### Diet
| Method | Endpoint                  | Notes                              |
|--------|---------------------------|------------------------------------|
| POST   | /api/diet/generate        | client only, needs approved result |
| PATCH  | /api/diet/:id/customize   | admin only                         |

### Yoga
| Method | Endpoint                          | Notes              |
|--------|-----------------------------------|--------------------|
| GET    | /api/yoga/sessions                | ?category= filter  |
| POST   | /api/yoga/assign                  | `{yoga_session_id}`|
| PATCH  | /api/yoga/progress/:assignmentId  | `{progress_notes}` |
| POST   | /api/yoga/upload                  | admin only         |
| PATCH  | /api/yoga/session/:id             | admin only         |

### Admin
| Method | Endpoint                        | Notes                          |
|--------|---------------------------------|--------------------------------|
| GET    | /api/admin/dashboard            | pending counts                 |
| GET    | /api/admin/clients              | all clients                    |
| GET    | /api/admin/clients/search?q=    | name/email search              |
| GET    | /api/admin/clients/:id          | full case history              |
| GET    | /api/admin/prakriti/pending     | pending assessments            |
| PATCH  | /api/admin/prakriti/:id/approve | approve + notify               |
| PATCH  | /api/admin/prakriti/:id/modify  | edit scores + notify           |
| GET    | /api/admin/diet/clients         | clients + latest diet          |
| PATCH  | /api/admin/diet/:id/customize   | customize + notify             |
| GET    | /api/admin/yoga/sessions        | all sessions                   |
| POST   | /api/admin/yoga/upload          | new session                    |
| PATCH  | /api/admin/yoga/session/:id     | edit session                   |
| GET    | /api/admin/analytics            | charts data                    |
| GET    | /api/admin/reports              | ?startDate=&endDate=&...       |
| GET    | /api/admin/reports/export       | same params → CSV download     |

---

## 8. Sample Test Credentials Summary

| Role   | Email                 | Password      |
|--------|-----------------------|---------------|
| Admin  | admin@ayurcare.com    | TestPass123!  |
| Client | arjun@example.com     | TestPass123!  |
| Client | sneha@example.com     | TestPass123!  |
| Client | rahul@example.com     | TestPass123!  |

---

## 9. Run Property Tests

Requires `ayurcare_test` database to exist.

```bash
TEST_DB_NAME=ayurcare_test DB_PASSWORD=your_password npm test
```

Expected output:
```
PASS tests/property/referentialIntegrity.test.js
  Property 34: Referential integrity prevents orphan records
    ✓ prakriti_results rejects insert with non-existent user_id
    ✓ notifications rejects insert with non-existent user_id
    ✓ diet_recommendations rejects insert with non-existent customized_for user_id
    ✓ yoga_plan_assignments rejects insert with non-existent user_id
    ✓ followups rejects insert with non-existent user_id

Test Suites: 1 passed
Tests:       5 passed
```
