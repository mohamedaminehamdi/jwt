const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api } = require('./helpers')

before(startServer)
after(stopServer)

test('GET /health responds ok', async () => {
  const res = await api('GET', '/health')
  assert.strictEqual(res.status, 200)
  assert.deepStrictEqual(res.body, { status: 'ok' })
})

test('unknown routes return a JSON 404', async () => {
  const res = await api('GET', '/nope')
  assert.strictEqual(res.status, 404)
  assert.strictEqual(res.body.msg, 'Route does not exist')
})
