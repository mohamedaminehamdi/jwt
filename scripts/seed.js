require('dotenv').config()
const mongoose = require('mongoose')
const connectDB = require('../db/connect')
const User = require('../models/User')
const Job = require('../models/Job')

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@jobs.dev',
  password: 'demo1234',
  location: 'Tunis',
}

const companies = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark Industries', 'Wonka', 'Cyberdyne', 'Soylent', 'Vandelay']
const positions = ['Backend Developer', 'Frontend Developer', 'Full Stack Engineer', 'DevOps Engineer', 'Data Analyst', 'QA Engineer', 'Mobile Developer']
const locations = ['Tunis', 'Sfax', 'Paris', 'Berlin', 'London', 'Remote']
const statuses = ['pending', 'pending', 'interview', 'declined', 'pending', 'interview']
const jobTypes = ['full-time', 'full-time', 'remote', 'part-time', 'internship']
const DAY = 24 * 60 * 60 * 1000

// 60 jobs spread over the last six months, varied but the same on every run
const demoJobs = (createdBy) =>
  Array.from({ length: 60 }, (_, i) => {
    const createdAt = new Date(Date.now() - i * 3 * DAY)
    const status = statuses[i % statuses.length]
    const statusHistory = [{ status: 'pending', at: createdAt }]
    if (status !== 'pending') {
      statusHistory.push({ status, at: new Date(Math.min(createdAt.getTime() + 5 * DAY, Date.now())) })
    }
    const salaryMin = i % 3 ? 30000 + (i % 7) * 5000 : undefined
    return {
      company: companies[i % companies.length],
      position: positions[(i * 3) % positions.length],
      jobLocation: locations[(i * 5) % locations.length],
      status,
      jobType: jobTypes[i % jobTypes.length],
      salaryMin,
      salaryMax: salaryMin && salaryMin + 15000,
      statusHistory,
      createdBy,
      createdAt,
      updatedAt: statusHistory.at(-1).at,
    }
  })

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database')
  }
  await connectDB(process.env.MONGO_URI)

  // start from a clean demo account every time
  const existing = await User.findOne({ email: DEMO_USER.email })
  if (existing) {
    await Job.deleteMany({ createdBy: existing._id })
    await existing.deleteOne()
  }
  const user = await User.create(DEMO_USER)
  const jobs = await Job.insertMany(demoJobs(user._id))

  console.log(`Seeded ${jobs.length} jobs. Log in as ${DEMO_USER.email} / ${DEMO_USER.password}`)
}

seed()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
