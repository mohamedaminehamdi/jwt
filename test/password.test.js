const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api, registerUser } = require('./helpers')

before(startServer)
after(stopServer)

test('changes the password', async () => {
  const user = await registerUser()
  const res = await api('PATCH', '/auth/password', {
    token: user.token,
    body: { currentPassword: user.password, newPassword: 'newSecret456' },
  })
  assert.strictEqual(res.status, 200)
  assert.ok(res.body.token)

  const oldLogin = await api('POST', '/auth/login', {
    body: { email: user.email, password: user.password },
  })
  assert.strictEqual(oldLogin.status, 401)

  const newLogin = await api('POST', '/auth/login', {
    body: { email: user.email, password: 'newSecret456' },
  })
  assert.strictEqual(newLogin.status, 200)
})

test('requires the correct current password', async () => {
  const user = await registerUser()
  const wrong = await api('PATCH', '/auth/password', {
    token: user.token,
    body: { currentPassword: 'not-it-123', newPassword: 'newSecret456' },
  })
  assert.strictEqual(wrong.status, 400)
  assert.strictEqual(wrong.body.msg, 'Current password is incorrect')

  const missing = await api('PATCH', '/auth/password', {
    token: user.token,
    body: { newPassword: 'newSecret456' },
  })
  assert.strictEqual(missing.status, 400)
})

test('validates the new password', async () => {
  const user = await registerUser()
  const res = await api('PATCH', '/auth/password', {
    token: user.token,
    body: { currentPassword: user.password, newPassword: '123' },
  })
  assert.strictEqual(res.status, 400)
  assert.match(res.body.msg, /password/)
})

test('tokens issued before a password change stop working', async () => {
  const user = await registerUser()
  const changed = await api('PATCH', '/auth/password', {
    token: user.token,
    body: { currentPassword: user.password, newPassword: 'newSecret456' },
  })

  const withOld = await api('GET', '/jobs', { token: user.token })
  assert.strictEqual(withOld.status, 401)

  const withNew = await api('GET', '/jobs', { token: changed.body.token })
  assert.strictEqual(withNew.status, 200)
})
