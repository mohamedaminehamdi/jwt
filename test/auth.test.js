const { test, before, after } = require('node:test')
const assert = require('node:assert')
const jwt = require('jsonwebtoken')
const { startServer, stopServer, api } = require('./helpers')

before(startServer)
after(stopServer)

const user = { name: 'Amine', email: 'Amine@Example.com', password: 'secret123' }

test('register creates a user and returns a token', async () => {
  const res = await api('POST', '/auth/register', { body: user })
  assert.strictEqual(res.status, 201)
  assert.deepStrictEqual(res.body.user, { name: 'Amine', email: 'amine@example.com' })
  assert.strictEqual(res.body.user.password, undefined)

  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET)
  assert.strictEqual(payload.name, 'Amine')
  assert.ok(payload.userId)
})

test('login returns a token for valid credentials', async () => {
  const res = await api('POST', '/auth/login', {
    body: { email: 'amine@example.com', password: user.password },
  })
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.user.email, 'amine@example.com')
  assert.ok(res.body.token)
})

test('GET /auth/me returns the logged in user', async () => {
  const login = await api('POST', '/auth/login', {
    body: { email: user.email, password: user.password },
  })
  const res = await api('GET', '/auth/me', { token: login.body.token })
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.user.name, 'Amine')
})

test('PATCH /auth/me updates the profile and keeps the password', async () => {
  const login = await api('POST', '/auth/login', {
    body: { email: user.email, password: user.password },
  })
  const res = await api('PATCH', '/auth/me', {
    token: login.body.token,
    body: { name: 'Amine H', email: user.email, location: 'Tunis' },
  })
  assert.strictEqual(res.status, 200)
  assert.deepStrictEqual(res.body.user, {
    name: 'Amine H',
    email: 'amine@example.com',
    location: 'Tunis',
  })
  assert.strictEqual(jwt.decode(res.body.token).name, 'Amine H')

  const again = await api('POST', '/auth/login', {
    body: { email: user.email, password: user.password },
  })
  assert.strictEqual(again.status, 200)
})
