<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Python Grader Web App Specification

## 1. Project Overview

Build a web-based Python coding grader using:

* **Next.js App Router**
* **Bun runtime**
* **TypeScript**
* **Tailwind CSS**
* **shadcn/ui**
* **lucide-react**
* **PostgreSQL**
* **Drizzle ORM or Prisma**
* **Local username/password authentication**
* **Monaco Editor for code editing**
* **Python grading with input/output testcases**

The app allows users to create local accounts, solve Python programming questions, submit code, retry submissions, and receive scores based on passed testcases.

---

## 2. Core Features

### User Features

* Register with username and password
* Login/logout
* View available questions
* Open a question detail page
* Write Python code in a browser editor
* Run code against sample testcases
* Submit code against all testcases
* View score per submission
* Retry questions unlimited times
* View submission history
* View best score per question

### Admin Features

* Create questions
* Edit questions
* Delete questions
* Add testcases to questions
* Edit testcases
* Delete testcases
* Mark testcases as sample or hidden
* Set total score per question
* Publish/unpublish questions
* View all submissions

---

## 3. Tech Stack

```txt
Runtime: Bun
Framework: Next.js App Router
Language: TypeScript
Styling: Tailwind CSS
UI Components: shadcn/ui
Icons: lucide-react
Database: PostgreSQL
ORM: Drizzle ORM or Prisma
Authentication: Local username/password
Password Hashing: argon2id or bcrypt
Code Editor: Monaco Editor
Python LSP: Pyright-based Monaco integration
Python Execution: Docker sandbox or isolated grading worker
```

---

## 4. UI Library Requirements

Use **shadcn/ui components** whenever available instead of plain HTML tags.

Recommended shadcn components:

```txt
Button
Input
Textarea
Label
Card
Tabs
Dialog
AlertDialog
Sheet
Table
Badge
Progress
Separator
ScrollArea
DropdownMenu
Avatar
Form
Select
Switch
Toast / Sonner
Resizable
Tooltip
Skeleton
```

Use `lucide-react` for icons.

Example icons:

```txt
Play
Send
CheckCircle
XCircle
Clock
Code
FileText
Settings
User
LogOut
Plus
Trash
Edit
Eye
EyeOff
```

---

## 5. User Roles

### Student

Students can:

* Register and login
* Browse published questions
* Write Python solutions
* Run sample tests
* Submit official attempts
* Retry questions
* View their own submissions
* View their best score

### Admin

Admins can:

* Manage questions
* Manage testcases
* View submissions
* Publish or unpublish questions

---

## 6. Scoring Rules

Each question has a `total_score`.

Each testcase receives an equal portion of the question score.

```txt
points_per_testcase = question.total_score / total_testcases
score_received = passed_testcases * points_per_testcase
```

Example:

```txt
Question total score: 100
Total testcases: 5
Passed testcases: 3

points_per_testcase = 100 / 5 = 20
score_received = 3 * 20 = 60
```

Scores should be stored as decimal values.

---

## 7. Database Schema

## users

Stores local user accounts.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Allowed roles:

```txt
student
admin
```

---

## questions

Stores coding questions.

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
  total_score DECIMAL(10, 2) NOT NULL DEFAULT 100,
  time_limit_ms INTEGER NOT NULL DEFAULT 2000,
  memory_limit_mb INTEGER NOT NULL DEFAULT 128,
  starter_code TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Allowed difficulty values:

```txt
easy
medium
hard
```

---

## testcases

Each testcase belongs to one question.

Each testcase has:

* input
* expected output
* visibility settings

```sql
CREATE TABLE testcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  name VARCHAR(255),
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Rules:

```txt
input is passed to stdin.
expected_output is the reference output.
sample testcases are visible to students.
hidden testcases are used only during official submit.
```

---

## submissions

Stores every user attempt.

```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  language VARCHAR(50) NOT NULL DEFAULT 'python',
  source_code TEXT NOT NULL,
  status VARCHAR(30) NOT NULL,
  passed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  runtime_ms INTEGER,
  memory_kb INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Allowed statuses:

```txt
queued
running
accepted
wrong_answer
runtime_error
time_limit_exceeded
memory_limit_exceeded
internal_error
```

---

## testcase_results

Stores the result of each testcase for a submission.

```sql
CREATE TABLE testcase_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  testcase_id UUID NOT NULL REFERENCES testcases(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  actual_output TEXT,
  expected_output TEXT,
  error_message TEXT,
  runtime_ms INTEGER,
  memory_kb INTEGER,
  passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Security rule:

```txt
For hidden testcases, do not expose expected_output or full actual_output to students.
```

---

## question_scores

Stores each user's best score per question.

```sql
CREATE TABLE question_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  best_submission_id UUID REFERENCES submissions(id),
  best_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, question_id)
);
```

---

## 8. App Routes

```txt
app/
  layout.tsx
  page.tsx

  login/
    page.tsx

  register/
    page.tsx

  dashboard/
    page.tsx

  questions/
    page.tsx

  questions/[slug]/
    page.tsx

  submissions/
    page.tsx

  submissions/[id]/
    page.tsx

  admin/
    page.tsx

  admin/questions/
    page.tsx

  admin/questions/new/
    page.tsx

  admin/questions/[id]/edit/
    page.tsx
```

---

## 9. API Routes

```txt
app/api/auth/register/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/me/route.ts

app/api/questions/route.ts
app/api/questions/[id]/route.ts
app/api/questions/[id]/testcases/route.ts

app/api/run-sample/route.ts
app/api/submit/route.ts
app/api/submissions/[id]/route.ts
```

---

## 10. Grading Flow

### Run Sample Tests

```txt
User writes Python code
↓
POST /api/run-sample
↓
Server loads only sample testcases
↓
Run code against each sample testcase
↓
Compare actual output with expected output
↓
Return visible testcase results
```

### Submit Official Attempt

```txt
User submits Python code
↓
Create submission with status queued
↓
Load all testcases for question
↓
Run code against each testcase
↓
Store testcase_results
↓
Calculate score
↓
Update submission status
↓
Update question_scores if this is user's best score
```

---

## 11. Output Comparison

Use normalized exact matching.

```ts
export function normalizeOutput(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

export function compareOutput(actual: string, expected: string) {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
```

Future comparison modes:

```txt
exact
ignore_trailing_whitespace
ignore_all_whitespace
floating_point_tolerance
custom_checker
```

---

## 12. Python Execution Requirements

Never execute user Python code directly inside the Next.js process.

Recommended architecture:

```txt
Next.js API
↓
Grading service
↓
Docker container
↓
Run Python code with testcase input
↓
Capture stdout, stderr, exit code, runtime
↓
Return testcase result
```

Sandbox requirements:

```txt
No network access
CPU limit
Memory limit
Timeout
Temporary filesystem
Non-root user
Delete files after run
```

Example Docker command concept:

```bash
docker run --rm \
  --network none \
  --memory 128m \
  --cpus 1 \
  --pids-limit 64 \
  --read-only \
  python:3.12-alpine \
  python /workspace/main.py
```

For production, use a separate grading worker or queue instead of running Docker directly from the web server.

---

## 13. Code Editor Requirements

Use Monaco Editor.

Required features:

```txt
Python syntax highlighting
Line numbers
Autocomplete
Diagnostics
Function signature help
Resizable editor area
Theme matching light/dark mode
Run button
Submit button
Output panel
Testcase result panel
```

Recommended packages:

```bash
bun add @monaco-editor/react monaco-editor
bun add lucide-react
```

For Python LSP support, evaluate:

```txt
monaco-pyright-lsp
monaco-languageclient
vscode-ws-jsonrpc
pyright
```

---

## 14. Main Question Page Layout

Use shadcn `ResizablePanelGroup`.

```txt
ResizablePanelGroup
  Left Panel:
    Card
      Question title
      Difficulty Badge
      Score Badge

      Tabs:
        Description
        Samples
        Submissions

  Right Panel:
    Card
      Monaco Editor

      Actions:
        Run Button
        Submit Button

    Tabs:
      Output
      Test Results
      Console
```

---

## 15. Admin Question Editor Layout

Use shadcn components.

```txt
Form
  Input title
  Input slug
  Select difficulty
  Input total score
  Input time limit
  Input memory limit
  Textarea description
  Textarea starter code
  Switch published

Table testcases
  Name
  Sample
  Hidden
  Sort Order
  Actions

Dialog add/edit testcase
  Input name
  Textarea input
  Textarea expected output
  Switch sample
  Switch hidden
  Input sort order
```

---

## 16. Authentication Rules

```txt
Users register using username and password.
Username must be unique.
Password must be hashed before saving.
Plain passwords must never be stored.
Use HTTP-only cookies for sessions.
Protect admin routes.
Protect submission routes.
```

Recommended password hashing:

```txt
argon2id
```

---

## 17. Business Rules

### Questions

```txt
Only published questions are visible to students.
Admins can see draft questions.
A question must have at least one testcase before publishing.
Each question has its own total_score.
Each question has its own time limit and memory limit.
```

### Testcases

```txt
Each testcase belongs to exactly one question.
Each testcase has input and expected_output.
Sample testcases are visible to students.
Hidden testcases are not fully visible to students.
All testcases are used for official submit.
```

### Submissions

```txt
Users can retry unlimited times.
Each retry creates a new submission.
Scores are calculated from passed testcases.
Best score is stored in question_scores.
Latest submission does not replace best score unless it is higher.
```

---

## 18. Suggested File Structure

```txt
src/
  app/
    api/
      auth/
        register/
          route.ts
        login/
          route.ts
        logout/
          route.ts
      me/
        route.ts
      questions/
        route.ts
        [id]/
          route.ts
          testcases/
            route.ts
      run-sample/
        route.ts
      submit/
        route.ts
      submissions/
        [id]/
          route.ts

    login/
      page.tsx

    register/
      page.tsx

    dashboard/
      page.tsx

    questions/
      page.tsx
      [slug]/
        page.tsx

    submissions/
      page.tsx
      [id]/
        page.tsx

    admin/
      page.tsx
      questions/
        page.tsx
        new/
          page.tsx
        [id]/
          edit/
            page.tsx

  components/
    ui/

    editor/
      code-editor.tsx
      output-panel.tsx
      testcase-results.tsx

    questions/
      question-card.tsx
      question-form.tsx
      testcase-form.tsx

    submissions/
      submission-status-badge.tsx
      submission-table.tsx

  lib/
    auth.ts
    db.ts

    grader/
      compare-output.ts
      run-python.ts
      score.ts

    validations/
      auth.ts
      question.ts
      submission.ts

  server/
    services/
      auth-service.ts
      question-service.ts
      submission-service.ts
      grading-service.ts

  db/
    schema.ts
    migrations/
```

---

## 19. Starter Commands

```bash
bun create next-app python-grader
cd python-grader

bunx shadcn@latest init

bunx shadcn@latest add button input textarea label card tabs dialog alert-dialog sheet table badge progress separator scroll-area dropdown-menu avatar form select switch tooltip skeleton resizable

bun add lucide-react

bun add drizzle-orm postgres
bun add argon2 zod

bun add @monaco-editor/react monaco-editor
```

Optional:

```bash
bun add monaco-languageclient vscode-ws-jsonrpc
```

---

## 20. MVP Milestones

### Milestone 1: Project Setup

* Set up Next.js with Bun
* Set up Tailwind CSS
* Set up shadcn/ui
* Set up database connection
* Set up ORM schema

### Milestone 2: Authentication

* Register page
* Login page
* Logout
* Session cookie
* Protected routes
* Admin-only routes

### Milestone 3: Question Management

* Admin question list
* Create question
* Edit question
* Delete question
* Publish/unpublish question

### Milestone 4: Testcase Management

* Add testcase
* Edit testcase
* Delete testcase
* Mark testcase as sample
* Mark testcase as hidden

### Milestone 5: Student Question Flow

* Question list
* Question detail page
* Monaco Python editor
* Sample testcase display
* Run sample tests

### Milestone 6: Submission System

* Submit code
* Run all testcases
* Store submission
* Store testcase results
* Calculate score
* Update best score

### Milestone 7: Submission History

* View previous submissions
* View testcase results
* View best score
* Retry question

---

## 21. Additional Feature Modules

These are not required for the first MVP, but they should be planned as future feature modules.

---

## 21.1 Leaderboard

### Description

Show rankings based on user scores.

### Features

* Global leaderboard
* Leaderboard per question
* Leaderboard per course/classroom
* Sort by total score
* Sort by solved questions
* Sort by fastest accepted submission
* Show username, score, solved count, and rank

### Suggested Table

```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  solved_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);
```

---

## 21.2 Course and Classroom System

### Description

Allow admins or teachers to group users and questions into classes.

### Features

* Create classrooms
* Join classroom by invite code
* Assign questions to a classroom
* View class progress
* View class leaderboard
* Manage students in a classroom

### Suggested Tables

```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  invite_code VARCHAR(50) NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(classroom_id, user_id)
);
```

---

## 21.3 Assignments and Due Dates

### Description

Allow questions to be assigned with deadlines.

### Features

* Create assignments
* Add multiple questions to an assignment
* Set start date
* Set due date
* Lock submissions after due date
* Show late submission status
* Calculate total assignment score

### Suggested Tables

```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_at TIMESTAMP,
  due_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE assignment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  UNIQUE(assignment_id, question_id)
);
```

---

## 21.4 Manual Rejudge

### Description

Allow admins to re-run old submissions after testcases or grading logic changes.

### Features

* Rejudge one submission
* Rejudge all submissions for one question
* Rejudge all submissions for one assignment
* Keep old result history
* Update best score after rejudge

### Suggested Table

```sql
CREATE TABLE rejudge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## 21.5 Plagiarism Detection

### Description

Detect similar submissions between users.

### Features

* Compare submissions for the same question
* Similarity score
* Highlight similar code sections
* Admin review page
* Ignore starter code during comparison

### Suggested Table

```sql
CREATE TABLE plagiarism_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  submission_a_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  submission_b_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 21.6 Floating-Point Checker

### Description

Support numeric answers where small precision differences are accepted.

### Features

* Set checker mode per question or testcase
* Absolute tolerance
* Relative tolerance
* Compare line-by-line numeric output

### Schema Addition

```sql
ALTER TABLE testcases
ADD COLUMN checker_type VARCHAR(50) NOT NULL DEFAULT 'exact';

ALTER TABLE testcases
ADD COLUMN float_tolerance DECIMAL(20, 10);
```

Allowed checker types:

```txt
exact
ignore_trailing_whitespace
ignore_all_whitespace
floating_point_tolerance
custom_checker
```

---

## 21.7 Custom Checker Scripts

### Description

Allow advanced grading with custom checker logic.

### Features

* Admin can upload/write checker code
* Checker receives input, expected output, and actual output
* Checker returns pass/fail with message
* Useful for multiple valid outputs

### Suggested Table

```sql
CREATE TABLE custom_checkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  language VARCHAR(50) NOT NULL DEFAULT 'python',
  source_code TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 21.8 Question Import and Export

### Description

Allow admins to import/export questions as JSON.

### Features

* Export question with testcases
* Import question from JSON
* Validate imported structure
* Duplicate question as copy
* Bulk import questions

### Example Format

```json
{
  "title": "Two Sum",
  "slug": "two-sum",
  "description": "Read two integers and print their sum.",
  "difficulty": "easy",
  "total_score": 100,
  "time_limit_ms": 2000,
  "memory_limit_mb": 128,
  "starter_code": "a, b = map(int, input().split())",
  "testcases": [
    {
      "name": "Sample 1",
      "input": "1 2\n",
      "expected_output": "3\n",
      "is_sample": true,
      "is_hidden": false
    }
  ]
}
```

---

## 21.9 Grading Queue and Worker

### Description

Move grading into a background worker system instead of grading directly in API routes.

### Features

* Queue submissions
* Worker processes submissions
* Better scalability
* Retry failed grading jobs
* Separate web app from code execution environment

### Suggested Tables

```sql
CREATE TABLE grading_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

---

## 21.10 Rate Limiting

### Description

Prevent spam submissions and brute-force login attempts.

### Features

* Limit login attempts
* Limit register attempts
* Limit run sample requests
* Limit official submissions
* Per-user and per-IP limits

### Suggested Table

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(identifier, action, window_start)
);
```

---

## 21.11 Admin Analytics

### Description

Give admins insights into platform usage and student progress.

### Features

* Total users
* Total submissions
* Accepted submission rate
* Average score per question
* Hardest questions
* Most attempted questions
* Student progress overview
* Submission activity chart

---

## 21.12 AI Code Feedback

### Description

Provide optional feedback on student code.

### Features

* Explain runtime errors
* Suggest improvements
* Give hints without revealing full solution
* Explain failed sample tests
* Summarize code quality

### Safety Rule

AI feedback should not reveal hidden testcase expected outputs.

---

## 21.13 Multi-Language Support

### Description

Allow more languages beyond Python in the future.

### Features

* Language selector
* Language-specific starter code
* Language-specific execution image
* Language-specific time limits
* Language-specific file extension

### Suggested Table

```sql
CREATE TABLE supported_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  docker_image VARCHAR(255) NOT NULL,
  file_extension VARCHAR(20) NOT NULL,
  run_command TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true
);
```

Examples:

```txt
python
javascript
typescript
cpp
java
go
rust
```
`

---

## 22. Security Considerations

```txt
Never run user code directly on the web server.
Use sandboxed execution.
Disable network access during code execution.
Set CPU limits.
Set memory limits.
Set process limits.
Use execution timeout.
Store passwords securely.
Use HTTP-only cookies.
Do not expose hidden testcase expected outputs.
Rate-limit submissions.
Validate all inputs with Zod.
```

---

## 23. Recommended MVP Priority

Build in this order:

```txt
1. Database schema
2. Authentication
3. Admin question CRUD
4. Admin testcase CRUD
5. Student question list
6. Question detail page
7. Monaco editor
8. Sample run
9. Official submit
10. Score calculation
11. Submission history
12. Best score tracking
```


## once you finish doing something (one feat)

### action
- feat -> feature
- fix -> fix bugs
- style -> format the code that DOES NOT EFFECT the meaning of the code
- refactor -> Code changed that DOES NOT EFFECT the code behavior
- chore -> update that is not about the code eg. .gitignore

- then, git commit -m "action: commit message"
