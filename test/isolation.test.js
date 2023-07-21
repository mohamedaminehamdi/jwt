const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api, registerUser } = require('./helpers')

let alice
let bob
let aliceJobId

before(async () => {
  await startServer()
  alice = await registerUser({ name: 'Alice' })
  bob = await registerUser({ name: 'Bob' })
  const res = await api('POST', '/jobs', {
    token: alice.token,
    body: { company: 'Acme', position: 'Designer' },
  })
  aliceJobId = res.body.job._id
})
after(stopServer)

test("users only list their own jobs", async () => {
  const res = await api('GET', '/jobs', { token: bob.token })
  assert.strictEqual(res.body.totalJobs, 0)
})

test("users cannot read, update or delete someone else's job", async () => {
  const read = await api('GET', `/jobs/${aliceJobId}`, { token: bob.token })
  const update = await api('PATCH', `/jobs/${aliceJobId}`, {
    token: bob.token,
    body: { status: 'declined' },
  })
  const remove = await api('DELETE', `/jobs/${aliceJobId}`, { token: bob.token })
  for (const res of [read, update, remove]) assert.strictEqual(res.status, 404)

  const stillThere = await api('GET', `/jobs/${aliceJobId}`, { token: alice.token })
  assert.strictEqual(stillThere.body.job.status, 'pending')
})

test('createdBy cannot be set or changed from the request body', async () => {
  const created = await api('POST', '/jobs', {
    token: bob.token,
    body: { company: 'Globex', position: 'Tester', createdBy: aliceJobId },
  })
  assert.notStrictEqual(created.body.job.createdBy, aliceJobId)

  const moved = await api('PATCH', `/jobs/${created.body.job._id}`, {
    token: bob.token,
    body: { createdBy: created.body.job._id },
  })
  assert.strictEqual(moved.body.job.createdBy, created.body.job.createdBy)

  const aliceJobs = await api('GET', '/jobs', { token: alice.token })
  assert.strictEqual(aliceJobs.body.totalJobs, 1)
})

test('stats only count your own jobs', async () => {
  const res = await api('GET', '/jobs/stats', { token: alice.token })
  assert.deepStrictEqual(res.body.defaultStats, { pending: 1, interview: 0, declined: 0 })
})
