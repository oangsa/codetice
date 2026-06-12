# Current Features

## Authentication and account

- Username/password registration
- Username/password login and logout
- Session-based authentication
- Role support for `student` and `admin`
- Settings page for self-service password change
- Admin password reset
- Admin-generated one-time reset links
- Public reset-password page for one-time reset tokens

## Student experience

- Classroom list page
- Classroom detail page
- Question list page
- Question detail page with split layout
- Monaco-based code editor
- Python diagnostics endpoint for editor feedback
- Language selector for supported runtimes
- Official solution submission
- Sample run endpoint
- Submission polling and result summary in the editor
- Submission history page
- Submission detail page
- Best-score tracking per question

## Question and testcase management

- Admin question list
- Create question
- Edit question
- Delete question
- Publish/unpublish question
- Question testcases CRUD
- Sample vs hidden testcase handling
- Difficulty, score, time limit, and memory limit settings
- Per-question allowed language settings

## Classroom and assignment features

- Create classroom
- Join classroom by invite code
- Classroom question assignment flow
- Assignment list page
- Assignment API support
- Late submission flagging for assignment due dates

## Admin features

- Admin dashboard entry points
- Admin languages page
- Supported language management
- Admin user list
- View all recent submissions
- Rejudge one submission
- Rejudge all submissions for a question

## Scoring and leaderboard

- Per-testcase grading results
- Score calculation based on passed testcases
- Stored best score per user/question
- Global leaderboard page
- Per-question leaderboard API
- Leaderboard recomputation after submissions

## Grading and execution

- Docker-based grading runtime
- Runtime profiles for supported languages
- Output comparison with checker support
- Hidden testcase output protection for students
- Background grading job processing

## Security and anti-abuse currently present

- Password hashing with Argon2
- Route protection for user/admin areas
- Rate limiting on auth and grading actions
- Idempotency keys for submit and run-sample actions
- Submission source size limits
- Grader stdout/stderr output limits
- No local host fallback for untrusted code execution when Docker is unavailable
- Fixed runtime allowlist for supported language execution

## Supported language model currently present

- Python
- JavaScript
- TypeScript

## Notes

- The codebase also contains groundwork for custom checkers, rejudge jobs, classrooms, assignments, and language administration.
- Some future-facing schema pieces exist beyond the current student UI surface.
