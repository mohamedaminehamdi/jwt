# Jobs API

A REST API (plus a small web UI) for tracking job applications. Users register,
log in with a JSON Web Token and manage their own applications: create, edit,
delete, search, filter, sort, paginate and view stats.

Built with Node.js, Express, MongoDB (Mongoose) and JWT.

Project page: https://mohamedaminehamdi.github.io/jwt/

## Features

- Register / login with bcrypt-hashed passwords and JWT auth
- Change password (signs out every other session), update profile, delete account
- Jobs CRUD, scoped to the logged in user, with salary range, posting link,
  notes and a history of status changes
- Search by position or company, filter by status, job type and date, sort, paginate
- Export the filtered jobs as CSV
- Stats: counts per status and job type, applications per month
- Security: helmet, CORS, rate limited auth routes, query sanitizing, body size
  limit, strong password rule, CSV formula escaping
- Request ids, request logging, compression, graceful shutdown, health check
  with database status
- OpenAPI docs served with Swagger UI at `/api-docs`
- Vanilla JS frontend served from `/`, with dark mode
- Tests with the built-in `node:test` runner, ESLint, Docker setup and GitHub Actions CI

## Getting started

Requirements: Node.js 18+ and MongoDB (or Docker).

```bash
npm install
cp .env.example .env   # then set JWT_SECRET
docker compose up -d mongo
npm run dev
```

Open http://localhost:3000 for the UI and http://localhost:3000/api-docs for the API docs.

Want some data to click through? `npm run seed` creates a demo account
(`demo@jobs.dev` / `demo1234`) with 60 jobs spread over the last six months.
It refuses to run when `NODE_ENV=production`.

### Environment variables

| Name           | Description                         | Example                            |
| -------------- | ----------------------------------- | ---------------------------------- |
| `PORT`         | Port the server listens on          | `3000`                             |
| `MONGO_URI`    | MongoDB connection string           | `mongodb://127.0.0.1:27017/jobs`   |
| `JWT_SECRET`   | Secret used to sign tokens          | a long random string               |
| `JWT_LIFETIME` | Token lifetime (default `30d`)      | `30d`                              |

The server exits at startup if `MONGO_URI` or `JWT_SECRET` is missing.

### Docker

Runs the API and MongoDB together (reads `JWT_SECRET` from `.env`):

```bash
docker compose up --build
```

Both containers have healthchecks; the app waits for MongoDB to be healthy and
shuts down cleanly on `docker stop`.

## Scripts

| Command        | Description                       |
| -------------- | --------------------------------- |
| `npm start`    | Start the server                  |
| `npm run dev`  | Start with nodemon                |
| `npm test`     | Run the test suite                |
| `npm run lint` | Run ESLint                        |
| `npm run seed` | Reset the demo account and jobs   |

## API

All routes are prefixed with `/api/v1`. Everything except register, login and
health needs an `Authorization: Bearer <token>` header. Full details are in the
Swagger UI at `/api-docs` (spec: `docs/openapi.json`).

| Method | Route            | Description                          |
| ------ | ---------------- | ------------------------------------ |
| POST   | `/auth/register` | Create an account, get a token       |
| POST   | `/auth/login`    | Log in, get a token                  |
| GET    | `/auth/me`       | Current user                         |
| PATCH  | `/auth/me`       | Update name, email, location         |
| DELETE | `/auth/me`       | Delete account and jobs (`password`) |
| PATCH  | `/auth/password` | Change password, get a fresh token   |
| GET    | `/jobs`          | List your jobs (see query below)     |
| POST   | `/jobs`          | Create a job                         |
| GET    | `/jobs/stats`    | Counts per status and job type, monthly totals |
| GET    | `/jobs/export`   | Matching jobs as CSV (same filters)  |
| GET    | `/jobs/:id`      | Get one job                          |
| PATCH  | `/jobs/:id`      | Update a job                         |
| DELETE | `/jobs/:id`      | Delete a job                         |
| GET    | `/health`        | Health check                         |

`GET /jobs` query parameters:

| Param     | Values                                                  | Default  |
| --------- | ------------------------------------------------------- | -------- |
| `status`  | `all`, `pending`, `interview`, `declined`               | `all`    |
| `jobType` | `all`, `full-time`, `part-time`, `remote`, `internship` | `all`    |
| `search`  | text matched against position or company (case-insensitive) |      |
| `from`    | jobs created on or after this day, `YYYY-MM-DD` (UTC)   |          |
| `to`      | jobs created on or before this day, `YYYY-MM-DD` (UTC)  |          |
| `sort`    | `latest`, `oldest`, `a-z`, `z-a`                        | `latest` |
| `page`    | page number                                             | `1`      |
| `limit`   | jobs per page, 1–100                                    | `10`     |

Job fields: `company` and `position` (required), `status`, `jobType`,
`jobLocation`, `salaryMin`, `salaryMax`, `link` (http or https), `notes`.
`statusHistory`, `createdBy` and the timestamps are set by the server.

Passwords need at least 8 characters with a letter and a number.

Errors are returned as `{ "msg": "..." }` with a matching status code. Every
response has an `X-Request-Id` header, which also appears in the request log.

### Example

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Amine","email":"amine@example.com","password":"secret123"}' | jq -r .token)

curl -s -X POST localhost:3000/api/v1/jobs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"company":"Acme","position":"Backend Developer","status":"interview"}'

curl -s "localhost:3000/api/v1/jobs?status=interview&sort=a-z" -H "Authorization: Bearer $TOKEN"
```

## Testing

Tests run against a real MongoDB; each test file uses its own throwaway database.

```bash
docker compose up -d mongo
npm test
```

Set `MONGO_URI_TEST` to point the tests at another server
(default `mongodb://127.0.0.1:27017`).

## Project structure

```
app.js              Express app and server start
controllers/        Route handlers (auth, jobs)
db/connect.js       MongoDB connection
docs/               OpenAPI 3 spec and the GitHub Pages site
errors/             Custom error classes
middleware/         Authentication, request ids, 404 and error handling
models/             Mongoose models (User, Job)
public/             Frontend (HTML, CSS, JS)
routes/             Express routers
scripts/seed.js     Demo data
test/               node:test suites
```

## License

MIT
