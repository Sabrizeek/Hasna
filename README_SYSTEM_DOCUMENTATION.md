# Lecturer Evaluation System (LES) - Complete System Documentation

Welcome to the Lecturer Evaluation System (LES)! This document is designed to give you a complete, A-to-Z understanding of how this system works, how data flows through it, and how to rigorously test every single feature.

Whether you are a developer, a QA tester, or an administrator, this guide will serve as your ultimate reference.

---

## 1. System Overview & Architecture

### The Tech Stack
- **Frontend (Client):** Built with **React.js (Vite)**, using Tailwind CSS for styling. It runs on port `5173`.
- **Backend (Server):** Built with **Node.js & Express.js**. It provides the REST API and runs on port `5000`.
- **Database:** **MySQL** database.
- **Security:** Uses JWT (JSON Web Tokens) for authentication and bcrypt for password hashing. 

### The Three Roles
The system has three distinct user roles, each with their own protected dashboards and capabilities:
1. **Admin:** The highest authority. Manages users, sets up the academic year (semesters, courses, assignments), manages peer evaluations, and audits the entire system.
2. **Lecturer:** Can view their own performance metrics, anonymous student feedback, awards, submit supervision reports, and upload peer evaluations.
3. **Student:** Can register for an account, log in, and submit structured evaluations for the modules they are enrolled in.

---

## 2. Core Workflows & Logic (How It Works)

### 2.1 User Registration & Approval Flow
1. **Registration:** A user (Student or Lecturer) goes to the Registration page. 
   - **Important:** If a student belongs to multiple departments, they can select *multiple* departments from the dropdown list.
2. **Pending State:** Upon registering, the account is created in the database but set to `status = 'pending'`. They **cannot** log in yet.
3. **Admin Approval:** The Admin logs into the system, navigates to **User Management**, and clicks "Approve" next to the user's name. The status changes to `approved`, and the user can now log in.

### 2.2 Academic Setup (The Hierarchy)
Before any evaluations can happen, the Admin must set up the database in this specific order:
1. **Departments:** Create the departments (e.g., Botany, Zoology).
2. **Semesters:** Create a Semester (e.g., "Semester 1", "2024/2025") and mark it as **Active**.
3. **Modules (Courses):** Create modules and assign them to departments.
4. **Lecturer Assignment:** Assign Lecturers to Modules for the active semester. A lecturer can be assigned as **Theory**, **Practical**, or **Both**.

### 2.3 The Evaluation Window
Students **cannot** evaluate modules unless the Admin explicitly opens an Evaluation Window. 
- Admin goes to **Evaluation Windows** -> Creates a window with a Start and End date.
- The system checks if the current date falls between the Start and End date. If yes, the window is "Open".

### 2.4 Student Evaluation Flow
1. **Dashboard:** The student logs in. The system fetches the active semester and the modules belonging to the student's selected departments.
2. **Module Selection:** The student checks the boxes next to the modules they want to evaluate.
   - **Validation 1:** If a module has no lecturers assigned, the checkbox is disabled ("No Lecturers Assigned").
   - **Validation 2:** If the student has already evaluated this module, the checkbox is disabled ("Already Evaluated").
3. **Evaluation Hub:** The student proceeds to the Evaluation Hub.
   - The system dynamically generates forms for *every* lecturer assigned to the selected modules.
   - If a lecturer teaches Theory AND Practical, the student must fill out **two separate forms** for that lecturer.
4. **Validations:**
   - The student must answer exactly **10 questions** (radio buttons) per form.
   - The student must enter a **text comment** for every form.
   - The "Submit" button will block the user until every single question and comment box across all selected modules is filled out.
5. **Submission:** The data is sent to the backend, grades are calculated as a percentage, and stored in the database.

### 2.5 Peer Evaluations
Lecturers evaluating other lecturers. This is an offline, paper-based process that is tracked digitally.
1. **Assignment:** Admin assigns Evaluator 1 and Evaluator 2 to a Target Lecturer.
2. **Uploading:** Evaluator 1 logs in, goes to "Peer Evaluations", and uploads a scanned PDF of their physical evaluation form.
3. **Review:** Admin goes to the Peer Evaluations page, downloads the PDF, and marks the status as "Accepted" or "Rejected".

### 2.6 Awards and Ratings
- **Calculation:** When a lecturer views their dashboard, the system calculates the average score of all student submissions for the active semester.
- **Awards System:**
  - **Gold Badge:** Average score >= 80%
  - **Silver Badge:** Average score >= 60% and < 80%
  - **Bronze Badge:** Average score >= 40% and < 60%
- **Anonymity:** Lecturers see the comments and scores, but student names and IDs are **never** shown to them. (Only Admins can see who submitted what in the Audit Logs to prevent duplicate spam).

---

## 3. Comprehensive Manual Test Cases

To ensure the system works flawlessly, follow these exact steps to test the entire application from scratch.

### Test Phase 1: Onboarding & Setup

**Test Case 1.1: Registration & Approval**
1. Go to `http://localhost:5173/register`
2. Register a new **Student**. Select *two different departments* (e.g., Botany and Zoology).
3. Attempt to log in with the new student account. 
   - **Expected Result:** Login fails with an "Account pending approval" error.
4. Log in as an **Admin**. (Use your admin credentials).
5. Go to **User Management** -> Find the new student in the "Pending" list. Click **Approve**.
6. Log out, and log back in as the **Student**.
   - **Expected Result:** Login succeeds.

**Test Case 1.2: Forgot Password**
1. Go to the login screen and click **Forgot Password**.
2. Enter the student's email address and submit.
3. Log in as **Admin**, go to **User Management**, and check the **Password Reset Requests** table.
4. Click **Approve** for the student. A temporary password will be shown in a modal popup.
5. Use that temporary password to log in as the student.

**Test Case 1.3: Academic Setup**
1. As Admin, go to **Semester Management**. Ensure there is an Active Semester.
2. Go to **Evaluation Windows**. Create a new window starting yesterday and ending next month. Ensure status says "Open".
3. Go to **Module Management**. Create a new Module (e.g., "Test Module 101").
4. Go to **Lecturer Assignments**. Select your Active Semester, select "Test Module 101", and assign a Lecturer to it for **Both** Theory and Practical.

### Test Phase 2: The Student Evaluation Experience

**Test Case 2.1: Validating Module Selection**
1. Log in as the **Student**.
2. On the dashboard, locate "Test Module 101". 
3. **Expected Result:** You should be able to select it. 
4. Look for a module that has no lecturers assigned in the Admin panel.
5. **Expected Result:** The checkbox should be disabled and say "No Lecturers Assigned".

**Test Case 2.2: Enforcing Question & Comment Validation**
1. Check "Test Module 101" and click **Start Evaluation**.
2. You will see two sections for the Lecturer (one for Theory, one for Practical).
3. Answer 5 questions in the Theory section, and leave the rest blank.
4. Scroll to the bottom and click **Submit Evaluations**.
5. **Expected Result:** An error message appears stating you must complete all questions and comments. You cannot proceed.
6. Now, answer all 10 questions for Theory, but leave the Comment box empty. Click Submit.
7. **Expected Result:** An error message appears preventing submission.
8. Fill out all 10 questions and comments for **both** Theory and Practical.
9. Click Submit.
10. **Expected Result:** Success message appears, and you are redirected to the dashboard.

**Test Case 2.3: Preventing Duplicate Evaluations**
1. On the Student Dashboard, locate "Test Module 101" again.
2. **Expected Result:** The checkbox is disabled, and it displays a green **"Already Evaluated"** badge. You cannot evaluate it again.

### Test Phase 3: Lecturer Experience & Awards

**Test Case 3.1: Viewing Feedback and Awards**
1. Log out and log in as the **Lecturer** who was just evaluated.
2. Go to the **Lecturer Dashboard**.
3. **Expected Result:** The dashboard should display a calculated overall rating based on the student's submission.
4. Depending on the score the student gave (e.g., all 5/5s = 100%), the lecturer should see a **Gold Award** badge on their screen.
5. Navigate to **Module Ratings**. The lecturer should see the student's text comment, but the student's name/ID MUST remain hidden.

**Test Case 3.2: Submitting Supervision Reports**
1. As the Lecturer, go to **Supervision Reports**.
2. Upload a sample PDF file and submit.
3. Log out, log in as **Admin**.
4. Go to **Reports & Audit**. Check the "Supervision Report Inbox". 
5. **Expected Result:** The Admin can view the PDF and change the status to "Accepted".

### Test Phase 4: Peer Evaluations

**Test Case 4.1: Assigning and Uploading**
1. As Admin, go to **Peer Evaluations**.
2. Assign "Lecturer A" and "Lecturer B" to evaluate "Lecturer C".
3. Log out and log in as **Lecturer A**.
4. Go to **Peer Evaluations**. You should see a pending assignment to evaluate Lecturer C.
5. Upload a PDF file and submit.
6. Log out, log in as **Admin**, go to **Peer Evaluations**.
7. **Expected Result:** In the bottom table, you can see Lecturer A's uploaded file. Click "Download" to verify it works, then change the status to "Accepted".

### Test Phase 5: Admin Auditing

**Test Case 5.1: Tracking Student Identity**
1. As Admin, go to **Reports & Audit**.
2. Look at the **Evaluation Records** table.
3. **Expected Result:** You should be able to see the exact scores and comments submitted by the student, **including their University ID and Name**. This proves that anonymity is maintained for the lecturer, but the Admin retains full auditing capabilities.
4. Look at the **Audit Logs** table. Ensure actions like "Submitted Evaluation" or "Accepted Report" are logged with timestamps.

---
*End of Documentation.* If all test cases pass successfully, the system is verified to be 100% operational and stable.
