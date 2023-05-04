const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api } = require('./helpers')

before(startServer)
after(stopServer)

test('GET /health reports the database connection', async () => {
  const res = await api('GET', '/health')
  assert.strictEqual(res.status, 200)
  assert.deepStrictEqual(res.body, { status: 'ok', db: 'connected' })
})

test('unknown routes return a JSON 404', async () => {
  const res = await api('GET', '/nope')
  assert.strictEqual(res.status, 404)
  assert.strictEqual(res.body.msg, 'Route does not exist')
})

test('every response carries a request id', async () => {
  const generated = await api('GET', '/health')
  assert.match(generated.headers.get('x-request-id'), /^[0-9a-f-]{36}$/)

  const echoed = await api('GET', '/health', { headers: { 'X-Request-Id': 'trace-42' } })
  assert.strictEqual(echoed.headers.get('x-request-id'), 'trace-42')

  const unsafe = await api('GET', '/health', { headers: { 'X-Request-Id': 'bad id <script>' } })
  assert.notStrictEqual(unsafe.headers.get('x-request-id'), 'bad id <script>')
})
