const { test, before, after } = require('node:test')
const assert = require('node:assert')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Job = require('../models/Job')
const { startServer, stopServer, api, registerUser } = require('./helpers')

let token

before(async () => {
  await startServer()
  ;({ token } = await registerUser())
  const createdBy = new mongoose.Types.ObjectId(jwt.decode(token).userId)

  // eight months (Nov 2022..Jun 2023), the nth month gets n applications;
  // inserted directly so createdAt can be set
  const docs = []
  for (let n = 1; n <= 8; n++) {
    const date = new Date(Date.UTC(2022, 9 + n, 15))
    for (let i = 0; i < n; i++) {
      docs.push({
        company: 'Acme',
        position: `Job ${n}-${i}`,
        status: ['pending', 'interview', 'declined'][i % 3],
        jobType: 'full-time',
        createdBy,
        createdAt: date,
        updatedAt: date,
      })
    }
  }
  await Job.collection.insertMany(docs)
})
after(stopServer)

test('counts jobs per status', async () => {
  const res = await api('GET', '/jobs/stats', { token })
  assert.strictEqual(res.status, 200)
  // 36 jobs, statuses cycle pending/interview/declined within each month
  assert.deepStrictEqual(res.body.defaultStats, { pending: 15, interview: 12, declined: 9 })
})

test('returns the six most recent months, oldest first', async () => {
  const res = await api('GET', '/jobs/stats', { token })
  assert.deepStrictEqual(res.body.monthlyApplications, [
    { date: 'Jan 2023', count: 3 },
    { date: 'Feb 2023', count: 4 },
    { date: 'Mar 2023', count: 5 },
    { date: 'Apr 2023', count: 6 },
    { date: 'May 2023', count: 7 },
    { date: 'Jun 2023', count: 8 },
  ])
})

test('a user without jobs gets zeroed stats', async () => {
  const other = await registerUser()
  const res = await api('GET', '/jobs/stats', { token: other.token })
  assert.deepStrictEqual(res.body, {
    defaultStats: { pending: 0, interview: 0, declined: 0 },
    monthlyApplications: [],
  })
})
