# AI Comment Summarizer Setup

This document explains how the Lecturer Evaluation System integrates AI-assisted comment summarization for lecturer evaluation results.

## Integration Location

The old standalone prototype was inspected in:

```text
chatbot/
```

It contained:
- A separate CommonJS Express backend.
- A separate React frontend.
- Placeholder chatbot UI.
- Placeholder `/api/chatbot/summarize` endpoint.
- Documentation mentioning Claude API.
- No trained local ML model files.
- No training script or dataset.

The integrated LES implementation is now in the main project:

```text
backend/services/aiSummarizerService.js
backend/controllers/lecturerController.js
backend/routes/lecturerRoutes.js
frontend/src/pages/LecturerEvaluationResults.jsx
```

## What The Feature Does

When a lecturer opens module evaluation results, the page includes a `Student Comments Summary` section.

The lecturer can click:

```text
Summarize Comments
```

The system then summarizes anonymous student comments for the selected:
- course/module
- semester
- academic year
- evaluation type: `theory` or `practical`

The response includes:
- total comments summarized
- summary paragraph
- key strengths
- improvement areas
- common themes
- generated timestamp

## API Endpoint

```http
POST /api/lecturer/comments/summarize
```

Authentication:

```text
Lecturer role only
```

Request body:

```json
{
  "courseId": 1,
  "semesterId": 1,
  "academicYear": "2025/2026",
  "type": "theory"
}
```

Success response:

```json
{
  "totalComments": 4,
  "summary": "Students said the lecturer explained concepts clearly...",
  "keyStrengths": ["The lecturer explained the concepts clearly."],
  "improvementAreas": ["More revision questions would help before assessments."],
  "commonThemes": ["Lecture clarity", "Assessment preparation"],
  "generatedAt": "2026-06-10T08:00:00.000Z"
}
```

No-comments response:

```json
{
  "totalComments": 0,
  "summary": "No student comments are available for summarization.",
  "keyStrengths": [],
  "improvementAreas": [],
  "commonThemes": [],
  "generatedAt": "2026-06-10T08:00:00.000Z"
}
```

## Privacy

The summarizer uses only:

```text
evaluation_submissions.comment_text
```

It does not send or return:
- student id
- student name
- student email
- university id
- registration number

The endpoint verifies that the authenticated lecturer is assigned to the requested module before summarizing comments.

## Model Status

The inspected `chatbot/` folder did not contain a trained model.

It had placeholder code for Claude API:

```text
Summary from Claude API will appear here
```

Because there was no trained model or complete Claude integration, LES uses a safe deterministic fallback summarizer by default.

## Fallback Summarizer

The fallback summarizer:
- splits comments into sentences
- detects positive feedback keywords
- detects improvement-related keywords
- extracts common themes
- returns structured output

This keeps the application working even when no external AI model is configured.

## Optional External Claude Hook

The service can optionally call Claude if both variables are configured:

```env
CLAUDE_API_KEY=your_key_here
CLAUDE_MODEL=your_model_name_here
```

If either variable is missing, or if the external model call fails, the fallback summarizer is used automatically.

No stack traces or model internals are returned to the frontend.

## Manual Testing

1. Start the backend:

```bash
cd backend
npm run dev
```

2. Start the frontend:

```bash
cd frontend
npm run dev
```

3. Login as a lecturer with assigned modules.

4. Open:

```text
Lecturer Dashboard -> View Evaluation
```

5. Click:

```text
Summarize Comments
```

6. Confirm:
- loading state appears
- summary card appears
- no student identity appears
- empty state appears if there are no comments

## Database Seed Data

`backend/config/initDatabase.js` seeds realistic 2-line demo comments for both theory and practical evaluation submissions.

Seeding is idempotent:
- it does not create unlimited duplicates
- it updates only old placeholder demo comments such as `Demo theory evaluation...`
- it does not overwrite real user comments

## Known Limitations

- No trained local ML model was found in the old `chatbot/` folder.
- The default summarizer is rule-based, not a neural model.
- Claude integration is optional and requires valid environment variables.
- The feature is summarization only, not a chatbot Q&A interface.
