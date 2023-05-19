const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { startServer, stopServer, api, registerUser } = require('./helpers')

let token

const jobs = [
  { company: 'Acme', position: 'Backend Developer', status: 'interview', jobType: 'full-time' },
  { company: 'Globex', position: 'Frontend Developer', status: 'pending', jobType: 'remote' },
  { company: 'Initech', position: 'C++ Engineer', status: 'declined', jobType: 'full-time' },
  { company: 'Umbrella', position: 'Data Analyst', status: 'pending', jobType: 'internship' },
  { company: 'Hooli', position: 'DevOps Engineer', status: 'pending', jobType: 'part-time' },
]

const list = async (query) => {
  const res = await api('GET', `/jobs?${query}`, { token })
  assert.strictEqual(res.status, 200)
  return res.body
}

const positions = (body) => body.jobs.map((job) => job.position)

before(async () => {
  await startServer()
  ;({ token } = await registerUser())
  // created one by one so createdAt order is predictable
  for (const job of jobs) await api('POST', '/jobs', { token, body: job })
})
after(stopServer)

test('filters by status and job type', async () => {
  assert.strictEqual((await list('status=pending')).totalJobs, 3)
  assert.strictEqual((await list('jobType=full-time')).totalJobs, 2)
  assert.deepStrictEqual(positions(await list('status=pending&jobType=remote')), [
    'Frontend Developer',
  ])
  assert.strictEqual((await list('status=all&jobType=all')).totalJobs, 5)
})

test('searches position and company case-insensitively and treats input literally', async () => {
  assert.deepStrictEqual(positions(await list('search=DEVELOPER&sort=a-z')), [
    'Backend Developer',
    'Frontend Developer',
  ])
  assert.deepStrictEqual(positions(await list('search=c%2B%2B')), ['C++ Engineer'])
  assert.strictEqual((await list('search=.*')).totalJobs, 0)
  assert.deepStrictEqual(positions(await list('search=globex')), ['Frontend Developer'])
})

test('sorts by date and position', async () => {
  assert.strictEqual(positions(await list('sort=latest'))[0], 'DevOps Engineer')
  assert.strictEqual(positions(await list('sort=oldest'))[0], 'Backend Developer')
  assert.deepStrictEqual(positions(await list('sort=a-z')), [
    'Backend Developer',
    'C++ Engineer',
    'Data Analyst',
    'DevOps Engineer',
    'Frontend Developer',
  ])
  assert.strictEqual(positions(await list('sort=z-a'))[0], 'Frontend Developer')
})

test('paginates results', async () => {
  const first = await list('sort=a-z&limit=2&page=1')
  assert.strictEqual(first.totalJobs, 5)
  assert.strictEqual(first.numOfPages, 3)
  assert.deepStrictEqual(positions(first), ['Backend Developer', 'C++ Engineer'])

  const last = await list('sort=a-z&limit=2&page=3')
  assert.deepStrictEqual(positions(last), ['Frontend Developer'])

  const beyond = await list('limit=2&page=9')
  assert.deepStrictEqual(beyond.jobs, [])
})

test('falls back to sane defaults for bad query values', async () => {
  const res = await list('page=-1&limit=abc&sort=sideways')
  assert.strictEqual(res.jobs.length, 5)
  assert.strictEqual(res.numOfPages, 1)
  assert.strictEqual((await list('limit=1000')).jobs.length, 5)
})

test('ignores repeated and nested query params', async () => {
  assert.strictEqual((await list('status=pending&status=declined')).totalJobs, 5)
  assert.strictEqual((await list('status[$ne]=pending')).totalJobs, 5)
})
