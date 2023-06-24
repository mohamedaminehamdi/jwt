# Jobs API

A REST API for tracking job applications, secured with JSON Web Tokens.

Started from a JWT basics demo; the goal is a complete API where users
register, log in and manage their own job applications.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
npm start
```

## API

All routes are prefixed with `/api/v1`. Job routes need an
`Authorization: Bearer <token>` header (the token comes from register/login).

| Method | Route            | Description                    |
| ------ | ---------------- | ------------------------------ |
| POST   | `/auth/register` | Create an account, get a token |
| POST   | `/auth/login`    | Log in, get a token            |
| GET    | `/auth/me`       | Current user                   |
| GET    | `/jobs`          | List your jobs                 |
| POST   | `/jobs`          | Create a job                   |
| GET    | `/jobs/:id`      | Get one job                    |
| PATCH  | `/jobs/:id`      | Update a job                   |
| DELETE | `/jobs/:id`      | Delete a job                   |

Errors are returned as `{ "msg": "..." }` with a matching status code.
