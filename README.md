# Lecturer Evaluation System

Full-stack Lecturer Evaluation System for the Faculty of Science, University of Ruhuna.

## Stack
- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MySQL
- Auth: JWT and bcrypt
- Charts: Chart.js

## Main Features
- University ID based login with no public sign up.
- Admin-created staff accounts and seeded student accounts.
- First-login password change enforcement.
- Forgot password requests reviewed by Admin.
- Role dashboards for Student, Lecturer, HoD, Dean, and Admin.
- Lecturer evaluation questionnaires for theory and practical modules.
- Evaluation windows controlled by Admin.
- Lecturer results charts with anonymous student responses.
- HoD and Dean analytics with privacy-safe aggregated data.
- Supervision report upload, review, status tracking, and award scoring.
- Global notifications and audit logs.

## Privacy Rule
Student identity is hidden from Lecturer, HoD, and Dean, but visible to Admin for audit and misuse tracking.

Lecturer, HoD, and Dean pages/APIs use counts, averages, distributions, anonymous comments, and report metadata only. Admin evaluation records and Admin exports may include student identity.

## Setup
Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Environment
Backend settings live in `backend/.env`.

Important values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lecturer_evaluation
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
DEFAULT_USER_PASSWORD=UOR@12345
```

SMTP/email settings are optional for development. If SMTP is missing or fails, the backend returns/logs a safe email preview.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password_without_spaces
SMTP_FROM="Lecturer Evaluation System <your_email@gmail.com>"
```

Frontend API URL lives in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Run
Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

The backend auto-initializes the MySQL schema and demo data on startup. Manual SQL imports are not required.

## Move Database To Another PC
Git clone copies the code, not the current MySQL database. For the built-in demo database, your friend can simply run the backend once and auto-initialization will seed demo data.

To copy your exact current database, export it on your PC:

```bash
cd backend
npm run db:export
```

This creates:

```text
backend/backups/les-database.sql
```

Copy that file to the same path on your friend's cloned project, then run:

```bash
cd backend
npm install
npm run db:import
npm run dev
```

The import script uses `backend/.env`, so your friend must set their own local MySQL `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` first. MySQL command-line tools must also be available in PATH.

If you need uploaded profile photos or supervision report files, copy `backend/uploads/` too.

## Demo Credentials
Default password for seeded demo users:

```text
UOR@12345
```

Default Admin:

```text
University ID: ADM001
Email: admin@ruhuna.lk
Password: Admin@123
```

Seeded role examples:

```text
Dean: DEAN001 / UOR@12345
HoD Botany: HOD005 / UOR@12345
Lecturer Botany: LEC005 / UOR@12345
Student: SCI2026001 / UOR@12345
```

Staff can log in with University ID or email. Students log in with University ID.

## Password Flow
- All seeded/demo non-admin users are forced to change the default password on first login.
- Users can update their password from Profile Settings.
- Current password is required.
- New password must be at least 8 characters and include uppercase, lowercase, and a number.
- After a successful password change, `first_login` and `must_change_password` are cleared.

## Forgot Password Flow
1. User clicks Forgot Password on the login page.
2. User enters University ID and email.
3. The frontend always shows a generic message.
4. If the details match an active account, a pending request is created.
5. Admin reviews the request in User Management.
6. Approval resets the user password to `DEFAULT_USER_PASSWORD`, emails/notifies the user, and forces password change on next login.
7. Rejection emails/notifies the user.

## Notifications
Every portal has a notification bell and notifications page.

Supported notification events include:
- Forgot password request created -> Admin.
- Password reset approved/rejected -> User.
- Account created -> New user.
- Announcement created -> Target users.
- Admin manual notification -> Specific user, role, or all users from User Management.
- Module assigned -> Lecturer.
- Evaluation submitted -> Student, Lecturer, and department HoD.
- Supervision report submitted -> Admin.
- Supervision report status updated -> Lecturer.
- Evaluation window opened/closed/reopened -> Students.

Users can see only their own notification rows.

## Role Testing Guide
Student:
- Log in with University ID.
- Change default password if prompted.
- Update profile/photo/phone/password.
- Select department, academic year, semester, and course.
- Select lecturer and view profile.
- Submit theory and practical questionnaires.
- Confirm duplicate submission is blocked.
- Check notifications.
- Submit forgot password request.

Lecturer:
- Log in with University ID or email.
- Change default password if prompted.
- View assigned modules.
- View evaluation result charts.
- Confirm no student identity appears.
- Upload supervision report.
- Track status and notifications.
- Update profile/password.

HoD:
- View department analytics.
- Filter by semester.
- Drill into lecturer details.
- View supervision reports.
- Export department report.
- Confirm no student identity appears.
- Check notifications and profile settings.

Dean:
- View faculty overview.
- Review department averages, top performers, and needs-attention sections.
- Drill into departments.
- Export faculty/department CSV reports.
- Confirm no student identity appears.
- Check notifications and profile settings.

Admin:
- Create/edit/activate/deactivate/delete users.
- Send notifications to a specific user, a role, or all users.
- Reset passwords and approve/reject forgot password requests.
- Manage departments, courses, semesters, module assignments, announcements, and evaluation windows.
- Review supervision reports.
- View evaluation records with student identity.
- Export evaluation records with student identity.
- Review audit logs and award scores.

## Security Notes
- JWT is stored in `sessionStorage` for tab-level auth isolation.
- Logout clears the current tab session.
- Protected frontend routes enforce role checks and show a clean 403 page for wrong-role access.
- Protected backend APIs use auth and role middleware.
- Student submission APIs use authenticated JWT user ID, not student IDs from request bodies.
- Password hashes are never returned by API responses.
- SQL queries use parameterized values.

## Known Limitations
- CSV export is implemented; PDF export is not included.
- SMTP delivery depends on valid mail-provider settings and app-password configuration.
- Notifications are stored as individual rows per user for reliability and simple demo behavior.
- The frontend bundle may warn about chunk size during production build; this does not block the app.
