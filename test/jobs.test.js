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

test('ignores server-owned fields sent by the client', async () => {
  const forged = {
    ...newJob,
    _id: '64a1f0c2e4b0a1b2c3d4e5f6',
    createdBy: '64a1f0c2e4b0a1b2c3d4e5f7',
    createdAt: '2001-01-01T00:00:00.000Z',
  }
  const created = await api('POST', '/jobs', { token, body: forged })
  assert.strictEqual(created.status, 201)
  const { job } = created.body
  assert.notStrictEqual(job._id, forged._id)
  assert.notStrictEqual(job.createdBy, forged.createdBy)
  assert.notStrictEqual(job.createdAt, forged.createdAt)

  const updated = await api('PATCH', `/jobs/${job._id}`, {
    token,
    body: { createdBy: forged.createdBy, createdAt: forged.createdAt, position: 'Lead' },
  })
  assert.strictEqual(updated.status, 200)
  assert.strictEqual(updated.body.job.position, 'Lead')
  assert.strictEqual(updated.body.job.createdBy, job.createdBy)
  assert.strictEqual(updated.body.job.createdAt, job.createdAt)
})

test('validates the salary range', async () => {
  const inverted = await api('POST', '/jobs', {
    token,
    body: { ...newJob, salaryMin: 60000, salaryMax: 40000 },
  })
  assert.strictEqual(inverted.status, 400)
  assert.match(inverted.body.msg, /Maximum salary/)

  const created = await api('POST', '/jobs', {
    token,
    body: { ...newJob, salaryMin: 40000, salaryMax: 60000 },
  })
  assert.strictEqual(created.status, 201)
  const id = created.body.job._id

  // raising only the minimum still checks it against the stored maximum
  const raised = await api('PATCH', `/jobs/${id}`, { token, body: { salaryMin: 70000 } })
  assert.strictEqual(raised.status, 400)

  const negative = await api('PATCH', `/jobs/${id}`, { token, body: { salaryMin: -1 } })
  assert.strictEqual(negative.status, 400)

  const cleared = await api('PATCH', `/jobs/${id}`, { token, body: { salaryMin: '', salaryMax: '' } })
  assert.strictEqual(cleared.status, 200)
  assert.strictEqual(cleared.body.job.salaryMin, null)
})

test('accepts only http and https links', async () => {
  const created = await api('POST', '/jobs', {
    token,
    body: { ...newJob, link: 'https://acme.dev/careers/42' },
  })
  assert.strictEqual(created.status, 201)
  assert.strictEqual(created.body.job.link, 'https://acme.dev/careers/42')

  for (const link of ['javascript:alert(1)', 'ftp://acme.dev', 'acme.dev']) {
    const res = await api('PATCH', `/jobs/${created.body.job._id}`, { token, body: { link } })
    assert.strictEqual(res.status, 400, link)
    assert.match(res.body.msg, /valid http or https link/)
  }
})

test('records each status change', async () => {
  const created = await api('POST', '/jobs', {
    token,
    body: { ...newJob, statusHistory: [{ status: 'declined', at: '2001-01-01' }] },
  })
  const id = created.body.job._id
  assert.deepStrictEqual(created.body.job.statusHistory.map((h) => h.status), ['pending'])

  await api('PATCH', `/jobs/${id}`, { token, body: { status: 'interview' } })
  await api('PATCH', `/jobs/${id}`, { token, body: { status: 'interview', notes: 'same status' } })
  const res = await api('PATCH', `/jobs/${id}`, { token, body: { status: 'declined' } })

  const history = res.body.job.statusHistory
  assert.deepStrictEqual(history.map((h) => h.status), ['pending', 'interview', 'declined'])
  assert.ok(history.every((h, i) => i === 0 || h.at >= history[i - 1].at))
})
