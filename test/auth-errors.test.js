const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api, registerUser } = require('./helpers')

before(startServer)
after(stopServer)

test('register rejects missing and invalid fields', async () => {
  const res = await api('POST', '/auth/register', {
    body: { name: 'A', email: 'not-an-email', password: '123' },
  })
  assert.strictEqual(res.status, 400)
  assert.match(res.body.msg, /valid email/)
  assert.match(res.body.msg, /password/)
})

test('register rejects a duplicate email', async () => {
  const { email } = await registerUser()
  const res = await api('POST', '/auth/register', {
    body: { name: 'Other', email: email.toUpperCase(), password: 'secret123' },
  })
  assert.strictEqual(res.status, 400)
  assert.match(res.body.msg, /Duplicate value entered for email/)
})

test('login requires email and password', async () => {
  const res = await api('POST', '/auth/login', { body: { email: 'a@b.co' } })
  assert.strictEqual(res.status, 400)
  assert.strictEqual(res.body.msg, 'Please provide email and password')
})

test('login rejects a wrong password and an unknown email the same way', async () => {
  const { email } = await registerUser()
  const wrongPassword = await api('POST', '/auth/login', {
    body: { email, password: 'wrong-password' },
  })
  const unknownEmail = await api('POST', '/auth/login', {
    body: { email: 'nobody@test.io', password: 'secret123' },
  })
  for (const res of [wrongPassword, unknownEmail]) {
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.msg, 'Invalid credentials')
  }
})

test('login is not fooled by query operators', async () => {
  await registerUser()
  const res = await api('POST', '/auth/login', {
    body: { email: { $ne: null }, password: 'secret123' },
  })
  assert.strictEqual(res.status, 400)
  assert.strictEqual(res.body.token, undefined)
})

test('malformed JSON returns 400', async () => {
  const res = await api('POST', '/auth/login', { body: '{"email": ' })
  assert.strictEqual(res.status, 400)
  assert.ok(res.body.msg)
})
