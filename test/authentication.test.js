const { test, before, after } = require('node:test')
const assert = require('node:assert')
const jwt = require('jsonwebtoken')
const { startServer, stopServer, api, registerUser } = require('./helpers')

before(startServer)
after(stopServer)

const expectRejected = (res) => {
  assert.strictEqual(res.status, 401)
  assert.strictEqual(res.body.msg, 'Authentication invalid')
}

test('rejects requests without a token', async () => {
  expectRejected(await api('GET', '/jobs'))
})

test('rejects a header without the Bearer scheme', async () => {
  const { token } = await registerUser()
  expectRejected(
    await api('GET', '/jobs', { headers: { Authorization: token } })
  )
})

test('rejects a malformed token', async () => {
  expectRejected(await api('GET', '/jobs', { token: 'not.a.token' }))
})

test('rejects a token signed with another secret', async () => {
  const token = jwt.sign({ userId: 'x', name: 'x' }, 'some-other-secret')
  expectRejected(await api('GET', '/jobs', { token }))
})

test('rejects an expired token', async () => {
  const token = jwt.sign({ userId: 'x', name: 'x' }, process.env.JWT_SECRET, {
    expiresIn: -10,
  })
  expectRejected(await api('GET', '/jobs', { token }))
})

test('accepts a valid token', async () => {
  const { token } = await registerUser()
  const res = await api('GET', '/jobs', { token })
  assert.strictEqual(res.status, 200)
  assert.deepStrictEqual(res.body, { jobs: [], totalJobs: 0, numOfPages: 0 })
})

test('rejects a valid signature for a user that does not exist', async () => {
  const token = jwt.sign(
    { userId: '64a1f0c2e4b0a1b2c3d4e5f6', name: 'Ghost' },
    process.env.JWT_SECRET
  )
  expectRejected(await api('GET', '/jobs', { token }))
})
