# Technologies and Tools Used

This document explains the main technologies, libraries, tools, and system techniques used in the Lecturer Evaluation System.

## Project Type

The system is a full-stack web application.

- Frontend: React single-page application
- Backend: Node.js REST API
- Database: MySQL relational database
- Authentication: JWT-based login with bcrypt password hashing
- Styling: Tailwind CSS
- Charts: Chart.js through React bindings

## Frontend Technologies

### React

React is used to build the user interface as reusable components and pages.

Used for:
- Landing page
- Login and forgot-password pages
- Student dashboard and evaluation flow
- Lecturer dashboard, charts, and supervision reports
- HoD and Dean analytics dashboards
- Admin management pages
- Profile and notification pages

Version used:

```text
react ^18.3.1
react-dom ^18.3.1
```

### Vite

Vite is the frontend development and build tool.

Used for:
- Fast local development server
- React app bundling
- Production build generation
- Environment variable support through `VITE_...` variables

Commands:

```bash
npm run dev
npm run build
npm run preview
```

Version used:

```text
vite ^5.4.8
@vitejs/plugin-react ^4.3.1
```

### React Router DOM

React Router DOM is used for frontend routing.

Used for:
- Public routes such as `/`, `/login`, `/forgot-password`
- Protected role routes such as `/student/dashboard`, `/lecturer/dashboard`, `/admin/dashboard`
- Role-based navigation
- Redirecting users to the correct dashboard
- Preventing wrong-role access with a 403 page

Version used:

```text
react-router-dom ^6.26.2
```

### Tailwind CSS

Tailwind CSS is used for frontend styling.

Used for:
- Responsive layouts
- Dashboards
- Cards, tables, forms, buttons, badges, and modals
- Role-specific themes:
  - Student: teal
  - Lecturer: blue
  - HoD: amber/gold
  - Dean: orange/coral
  - Admin: navy/gold

Version used:

```text
tailwindcss ^3.4.10
postcss ^8.4.45
autoprefixer ^10.4.20
```

### Axios

Axios is used for frontend HTTP requests to the backend API.

Used for:
- Login
- Fetching dashboard data
- Submitting evaluations
- Uploading supervision reports
- Admin CRUD actions
- Notifications
- Profile updates

The shared Axios instance is in:

```text
frontend/src/api/axios.js
```

It attaches the JWT token from `sessionStorage` to API requests.

Version used:

```text
axios ^1.7.7
```

### Chart.js and React Chart.js 2

Chart.js is used for analytics charts.

Used for:
- Lecturer question score pie charts
- Overall grade distribution pie charts
- HoD average score charts
- Dean faculty and department charts

Versions used:

```text
chart.js ^4.5.1
react-chartjs-2 ^5.3.1
```

### Browser Storage

The system uses:

```text
sessionStorage
```

Used for:
- Storing JWT auth token per browser tab
- Keeping different logins isolated in different tabs

The system intentionally avoids persistent `localStorage` auth.

## Backend Technologies

### Node.js

Node.js runs the backend server.

Used for:
- Express REST API
- Database initialization
- Authentication
- File upload handling
- Email sending
- Notification and audit logic

The backend uses ES modules:

```json
"type": "module"
```

### Express.js

Express is the backend web framework.

Used for:
- API routing
- Middleware
- Error handling
- Static upload serving
- Role-based API modules

Main server file:

```text
backend/server.js
```

Version used:

```text
express ^4.21.0
```

### MySQL

MySQL is the relational database.

Used to store:
- Users
- Departments
- Courses
- Semesters
- Lecturer profiles
- Lecturer module assignments
- Evaluation questions
- Evaluation submissions
- Evaluation responses
- Evaluation windows
- Supervision reports
- Notifications
- Audit logs
- Password reset requests
- Award scores

The database is auto-initialized from:

```text
backend/config/initDatabase.js
```

Manual SQL imports are not required for normal demo setup.

### mysql2

`mysql2/promise` is used to connect Node.js to MySQL.

Used for:
- Parameterized SQL queries
- Connection pooling
- Async database operations

Database connection file:

```text
backend/config/db.js
```

Version used:

```text
mysql2 ^3.11.4
```

### JWT

JSON Web Tokens are used for authentication.

Used for:
- Login sessions
- Protecting backend API routes
- Identifying the authenticated user
- Enforcing role-based access

Version used:

```text
jsonwebtoken ^9.0.2
```

### bcrypt

bcrypt is used for password hashing.

Used for:
- Hashing default passwords
- Verifying login passwords
- Resetting passwords
- Updating passwords securely

Version used:

```text
bcrypt ^5.1.1
```

### CORS

CORS middleware allows the frontend dev server to call the backend API.

Used for:
- Allowing requests from `http://localhost:5173`
- Controlled by `CLIENT_URL` in `backend/.env`

Version used:

```text
cors ^2.8.5
```

### dotenv

dotenv loads environment variables from `.env`.

Used for:
- Database credentials
- JWT secret
- SMTP credentials
- Admin defaults
- Client URL
- Default demo password

Version used:

```text
dotenv ^16.4.5
```

### Multer

Multer handles file uploads.

Used for:
- Lecturer supervision report uploads
- Profile photo uploads
- File type validation
- File size limits

Upload middleware file:

```text
backend/middleware/uploadMiddleware.js
```

Version used:

```text
multer ^2.1.1
```

### Nodemailer

Nodemailer sends emails.

Used for:
- New user credential emails
- Password reset approval/rejection emails
- Safe email preview fallback when SMTP is not configured

Email utility:

```text
backend/utils/emailService.js
```

Version used:

```text
nodemailer ^8.0.10
```

## Development Tools

### Nodemon

Nodemon restarts the backend automatically during development.

Command:

```bash
npm run dev
```

Version used:

```text
nodemon ^3.1.4
```

### npm

npm is used for:
- Installing dependencies
- Running frontend and backend scripts
- Running database export/import scripts

Important backend scripts:

```bash
npm run dev
npm run start
npm run seed:admin
npm run db:export
npm run db:import
```

Important frontend scripts:

```bash
npm run dev
npm run build
npm run preview
```

### Git

Git is used for version control.

Important note:
- Git stores source code.
- Git does not automatically store the live MySQL database.
- Use `npm run db:export` and `npm run db:import` to move the exact database to another PC.

## Security Techniques Used

### Role-Based Access Control

The system uses role-based access for:

- Admin
- Student
- Lecturer
- HoD
- Dean

Backend middleware:

```text
backend/middleware/authMiddleware.js
backend/middleware/roleMiddleware.js
```

Frontend route protection:

```text
frontend/src/components/ProtectedRoute.jsx
```

### Password Security

Password security includes:
- bcrypt hashing
- No plaintext password storage
- First-login password change
- Admin password reset to default password
- Forced password change after reset
- Password strength rules

### SQL Injection Protection

The backend uses parameterized MySQL queries.

This means user inputs are passed separately from SQL strings instead of being directly concatenated into queries.

### Student Identity Privacy

Lecturer, HoD, and Dean analytics do not expose student identity.

Student identities are hidden from:
- Lecturer evaluation results
- HoD dashboard
- HoD lecturer detail
- Dean dashboard
- Dean department drill-down
- HoD/Dean exports

Admin can view student identity only for audit and misuse tracking.

### File Upload Security

Upload protections include:
- Allowed file types for supervision reports: PDF, DOC, DOCX
- Maximum supervision report size: 10MB
- Safe upload folders
- Profile photo upload handling

## System Features Supported By The Technologies

### Authentication

Implemented using:
- React login forms
- Axios
- Express auth routes
- JWT
- bcrypt
- MySQL users table

### Evaluations

Implemented using:
- Student React pages
- Question APIs
- MySQL evaluation tables
- Duplicate submission constraints
- Transaction-based submission saving

### Lecturer Charts

Implemented using:
- Chart.js
- react-chartjs-2
- Aggregated MySQL queries
- Anonymous comments

### Supervision Reports

Implemented using:
- React upload forms
- Multer
- Express static files
- MySQL supervision report records

### Notifications

Implemented using:
- MySQL notifications table
- Notification service utility
- React notification bell
- Notifications page
- Admin manual notification sender

### Audit Logs

Implemented using:
- MySQL audit logs table
- Audit logging utility
- Admin reports/audit page

### Database Auto-Initialization

Implemented using:
- `backend/config/initDatabase.js`
- MySQL DDL statements
- Seed data functions
- Index creation
- Safe migrations

## Environment Files

Backend:

```text
backend/.env
```

Frontend:

```text
frontend/.env
```

These files are not committed to Git because they may contain sensitive local configuration.

## Main Folder Structure

```text
backend/
  config/
  controllers/
  middleware/
  routes/
  scripts/
  utils/
  uploads/
  server.js

frontend/
  src/
    api/
    components/
    context/
    pages/
  index.html
```

## Summary

The Lecturer Evaluation System uses a modern JavaScript full-stack architecture:

- React and Vite for the frontend
- Tailwind CSS for responsive UI
- Express and Node.js for the backend API
- MySQL for relational data storage
- JWT and bcrypt for secure authentication
- Chart.js for analytics visualization
- Multer for uploads
- Nodemailer for email notifications
- sessionStorage for per-tab login isolation
- Git and npm for development workflow
