const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api, registerUser } = require('./helpers')

let token

before(async () => {
  await startServer()
  ;({ token } = await registerUser())
  await api('POST', '/jobs', {
    token,
    body: { company: 'Acme, Inc.', position: 'Backend Developer', notes: 'Said "soon"' },
  })
  await api('POST', '/jobs', {
    token,
    body: { company: 'Globex', position: '=HYPERLINK("http://evil")', status: 'interview', salaryMin: 50000 },
  })
  const other = await registerUser()
  await api('POST', '/jobs', { token: other.token, body: { company: 'Hidden', position: 'Spy' } })
})
after(stopServer)

const rows = (csv) => csv.trim().split('\r\n')

test('exports the user\'s jobs as CSV', async () => {
  const res = await api('GET', '/jobs/export?sort=oldest', { token })
  assert.strictEqual(res.status, 200)
  assert.match(res.headers.get('content-type'), /^text\/csv/)
  assert.match(res.headers.get('content-disposition'), /attachment; filename="jobs.csv"/)

  const [header, first, second, ...rest] = rows(res.body)
  assert.strictEqual(rest.length, 0, 'other users\' jobs are not exported')
  assert.strictEqual(
    header,
    '"company","position","status","jobType","jobLocation","salaryMin","salaryMax","link","notes","createdAt"'
  )
  assert.ok(first.startsWith('"Acme, Inc.","Backend Developer","pending","full-time","","","",""'))
  assert.ok(first.includes('"Said ""soon"""'))
  assert.ok(second.startsWith('"Globex","\'=HYPERLINK(""http://evil"")","interview","full-time","","50000"'))
})

test('applies the list filters', async () => {
  const res = await api('GET', '/jobs/export?status=interview', { token })
  assert.strictEqual(rows(res.body).length, 2)
  const bad = await api('GET', '/jobs/export?from=nope', { token })
  assert.strictEqual(bad.status, 400)
})
