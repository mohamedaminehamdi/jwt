const { test, before, after } = require('node:test')
const assert = require('node:assert')
const Job = require('../models/Job')
const { startServer, stopServer, api, registerUser } = require('./helpers')

before(startServer)
after(stopServer)

test('deletes the account and its jobs', async () => {
  const user = await registerUser()
  const other = await registerUser()
  for (const token of [user.token, user.token, other.token]) {
    await api('POST', '/jobs', { token, body: { company: 'Acme', position: 'Dev' } })
  }

  const res = await api('DELETE', '/auth/me', {
    token: user.token,
    body: { password: user.password },
  })
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.msg, 'Account deleted')

  assert.strictEqual(await Job.countDocuments(), 1, 'only the other user keeps a job')
  assert.strictEqual((await api('GET', '/auth/me', { token: user.token })).status, 401)
  const login = await api('POST', '/auth/login', {
    body: { email: user.email, password: user.password },
  })
  assert.strictEqual(login.status, 401)
})

test('requires the correct password', async () => {
  const user = await registerUser()
  const wrong = await api('DELETE', '/auth/me', {
    token: user.token,
    body: { password: 'not-it-123' },
  })
  assert.strictEqual(wrong.status, 400)
  const missing = await api('DELETE', '/auth/me', { token: user.token })
  assert.strictEqual(missing.status, 400)
  assert.strictEqual((await api('GET', '/auth/me', { token: user.token })).status, 200)
})
