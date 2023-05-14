const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api, registerUser } = require('./helpers')

let token

before(async () => {
  await startServer()
  ;({ token } = await registerUser())
})
after(stopServer)

const newJob = { company: 'Acme', position: 'Backend Developer', jobLocation: 'Tunis' }

test('creates a job with defaults', async () => {
  const res = await api('POST', '/jobs', { token, body: newJob })
  assert.strictEqual(res.status, 201)
  assert.strictEqual(res.body.job.company, 'Acme')
  assert.strictEqual(res.body.job.status, 'pending')
  assert.strictEqual(res.body.job.jobType, 'full-time')
})

test('rejects a job without company or position', async () => {
  const res = await api('POST', '/jobs', { token, body: { jobLocation: 'Tunis' } })
  assert.strictEqual(res.status, 400)
  assert.match(res.body.msg, /company/)
  assert.match(res.body.msg, /position/)
})

test('gets, updates and deletes a job', async () => {
  const created = await api('POST', '/jobs', { token, body: newJob })
  const id = created.body.job._id

  const fetched = await api('GET', `/jobs/${id}`, { token })
  assert.strictEqual(fetched.status, 200)
  assert.strictEqual(fetched.body.job.position, 'Backend Developer')

  const updated = await api('PATCH', `/jobs/${id}`, {
    token,
    body: { status: 'interview', jobType: 'remote' },
  })
  assert.strictEqual(updated.status, 200)
  assert.strictEqual(updated.body.job.status, 'interview')
  assert.strictEqual(updated.body.job.jobType, 'remote')

  const removed = await api('DELETE', `/jobs/${id}`, { token })
  assert.strictEqual(removed.status, 200)

  const gone = await api('GET', `/jobs/${id}`, { token })
  assert.strictEqual(gone.status, 404)
})

test('update validates fields', async () => {
  const created = await api('POST', '/jobs', { token, body: newJob })
  const id = created.body.job._id

  const empty = await api('PATCH', `/jobs/${id}`, { token, body: { company: '' } })
  assert.strictEqual(empty.status, 400)

  const badStatus = await api('PATCH', `/jobs/${id}`, { token, body: { status: 'hired' } })
  assert.strictEqual(badStatus.status, 400)
  assert.match(badStatus.body.msg, /not a valid enum value/)
})

test('unknown and malformed ids return 404', async () => {
  const unknown = await api('GET', '/jobs/64a1f0c2e4b0a1b2c3d4e5f6', { token })
  assert.strictEqual(unknown.status, 404)

  const malformed = await api('DELETE', '/jobs/not-an-id', { token })
  assert.strictEqual(malformed.status, 404)
})

test('stores notes and limits their length', async () => {
  const created = await api('POST', '/jobs', {
    token,
    body: { ...newJob, notes: 'Referred by Sara. Follow up on Friday.' },
  })
  assert.strictEqual(created.status, 201)
  assert.strictEqual(created.body.job.notes, 'Referred by Sara. Follow up on Friday.')

  const tooLong = await api('PATCH', `/jobs/${created.body.job._id}`, {
    token,
    body: { notes: 'x'.repeat(1001) },
  })
  assert.strictEqual(tooLong.status, 400)
})
