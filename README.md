# Jobs API

A REST API (plus a small web UI) for tracking job applications. Users register,
log in with a JSON Web Token and manage their own applications: create, edit,
delete, search, filter, sort, paginate and view stats.

Built with Node.js, Express, MongoDB (Mongoose) and JWT.

## Features

- Register / login with bcrypt-hashed passwords and JWT auth
- Jobs CRUD, scoped to the logged in user
- Search by position, filter by status and job type, sort, paginate
- Stats: counts per status and applications per month
- Security: helmet, CORS, rate limited auth routes, query sanitizing, body size limit
- OpenAPI docs served with Swagger UI at `/api-docs`
- Vanilla JS frontend served from `/`
- Tests with the built-in `node:test` runner, Docker setup and GitHub Actions CI

## Getting started

Requirements: Node.js 18+ and MongoDB (or Docker).

```bash
npm install
cp .env.example .env   # then set JWT_SECRET
docker compose up -d mongo
npm run dev
```

Open http://localhost:3000 for the UI and http://localhost:3000/api-docs for the API docs.

### Environment variables

| Name           | Description                         | Example                            |
| -------------- | ----------------------------------- | ---------------------------------- |
| `PORT`         | Port the server listens on          | `3000`                             |
| `MONGO_URI`    | MongoDB connection string           | `mongodb://127.0.0.1:27017/jobs`   |
| `JWT_SECRET`   | Secret used to sign tokens          | a long random string               |
| `JWT_LIFETIME` | Token lifetime                      | `30d`                              |

### Docker

Runs the API and MongoDB together (reads `JWT_SECRET` from `.env`):

```bash
docker compose up --build
```

## Scripts

| Command       | Description                     |
| ------------- | ------------------------------- |
| `npm start`   | Start the server                |
| `npm run dev` | Start with nodemon              |
| `npm test`    | Run the test suite              |

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
| GET    | `/jobs`          | List your jobs (see query below)     |
| POST   | `/jobs`          | Create a job                         |
| GET    | `/jobs/stats`    | Counts per status, monthly totals    |
| GET    | `/jobs/:id`      | Get one job                          |
| PATCH  | `/jobs/:id`      | Update a job                         |
| DELETE | `/jobs/:id`      | Delete a job                         |
| GET    | `/health`        | Health check                         |

`GET /jobs` query parameters:

| Param     | Values                                                  | Default  |
| --------- | ------------------------------------------------------- | -------- |
| `status`  | `all`, `pending`, `interview`, `declined`               | `all`    |
| `jobType` | `all`, `full-time`, `part-time`, `remote`, `internship` | `all`    |
| `search`  | text matched against the position (case-insensitive)    |          |
| `sort`    | `latest`, `oldest`, `a-z`, `z-a`                        | `latest` |
| `page`    | page number                                             | `1`      |
| `limit`   | jobs per page, 1–100                                    | `10`     |

Errors are returned as `{ "msg": "..." }` with a matching status code.

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
docs/openapi.json   OpenAPI 3 spec
errors/             Custom error classes
middleware/         Authentication, 404 and error handling
models/             Mongoose models (User, Job)
public/             Frontend (HTML, CSS, JS)
routes/             Express routers
test/               node:test suites
```

## License

MIT
