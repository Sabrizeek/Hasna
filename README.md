# Lecturer Evaluation System Foundation

This workspace contains a beginner-friendly full-stack foundation for the Lecturer Evaluation System.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MySQL
- Authentication: JWT
- Password hashing: bcrypt

## Folder Layout
- `backend/` - Express API, MySQL schema, auth, RBAC, and admin CRUD
- `frontend/` - React admin panel, auth screens, and role placeholders

## Backend Setup
1. Open a terminal in `backend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update `backend/.env` with your MySQL credentials and JWT secret.
4. Start the backend once. It will create the database schema and seed the six departments plus the admin account automatically.
5. If you want custom admin credentials, edit `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env` before starting the server.
6. Start the server:
   ```bash
   npm run dev
   ```

## Frontend Setup
1. Open a terminal in `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Check `frontend/.env` if your backend runs on a different port.
4. Start the app:
   ```bash
   npm run dev
   ```

## API Base URL
- Backend: `http://localhost:5000/api`
- Frontend: `http://localhost:5173`

## Main Flow
- Student or lecturer registers and is saved as `pending`
- Admin logs in and approves or rejects the account
- Approved users can log in
- Admin manages departments, semesters, courses, users, and announcements

## Notes
- JWT is stored in `sessionStorage` so separate browser tabs keep separate logins.
- Department and announcement lists are readable so the landing page and register form can work.
- Default admin login: `admin@ruhuna.lk` / `Admin@123`.
- Student and lecturer registrations still create `pending` accounts until the admin approves them.
