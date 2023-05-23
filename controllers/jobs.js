const mongoose = require('mongoose')
const { StatusCodes } = require('http-status-codes')
const Job = require('../models/Job')
const { BadRequest, NotFound } = require('../errors')

const sortOptions = {
  latest: '-createdAt',
  oldest: 'createdAt',
  'a-z': 'position',
  'z-a': '-position',
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// YYYY-MM-DD (UTC) to a Date, or undefined when it is not a real day
const parseDay = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  return date.toISOString().startsWith(value) ? date : undefined
}

// fields the server owns; clients can never set them
const clientFields = ({ _id, createdBy, createdAt, updatedAt, statusHistory, ...fields }) =>
  fields

// filter and sort shared by the jobs list and the CSV export
const buildQuery = (req) => {
  // ignore repeated (?a=1&a=2) or nested (?a[b]=1) params, only plain strings are valid
  const { status, jobType, search, sort, from, to } = Object.fromEntries(
    Object.entries(req.query).filter(([, value]) => typeof value === 'string')
  )
  const queryObject = { createdBy: req.user.userId }
  if (status && status !== 'all') queryObject.status = status
  if (jobType && jobType !== 'all') queryObject.jobType = jobType
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    queryObject.$or = [{ position: pattern }, { company: pattern }]
  }
  if (from || to) {
    const createdAt = {}
    for (const [name, value] of Object.entries({ from, to })) {
      if (!value) continue
      const day = parseDay(value)
      if (!day) throw new BadRequest(`${name} must be a date like 2023-05-20`)
      // "to" includes the whole day
      if (name === 'from') createdAt.$gte = day
      else createdAt.$lt = new Date(day.getTime() + 24 * 60 * 60 * 1000)
    }
    // built by the server, so sanitizeFilter must not wrap the operators
    queryObject.createdAt = mongoose.trusted(createdAt)
  }
  return { queryObject, sortBy: sortOptions[sort] || sortOptions.latest }
}

const getAllJobs = async (req, res) => {
  const { queryObject, sortBy } = buildQuery(req)
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)

  const [jobs, totalJobs] = await Promise.all([
    Job.find(queryObject)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit),
    Job.countDocuments(queryObject),
  ])
  res
    .status(StatusCodes.OK)
    .json({ jobs, totalJobs, numOfPages: Math.ceil(totalJobs / limit) })
}

const csvColumns = [
  'company',
  'position',
  'status',
  'jobType',
  'jobLocation',
  'salaryMin',
  'salaryMax',
  'link',
  'notes',
  'createdAt',
]

// quote every cell; a leading = + - @ would run as a formula when opened in a spreadsheet
const csvCell = (value) => {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

const exportJobs = async (req, res) => {
  const { queryObject, sortBy } = buildQuery(req)
  const jobs = await Job.find(queryObject).sort(sortBy).lean()
  const rows = [csvColumns, ...jobs.map((job) => csvColumns.map((column) => job[column]))]
  res
    .attachment('jobs.csv')
    .send(rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n')
}

const getJob = async (req, res) => {
  const { id } = req.params
  const job = await Job.findOne({ _id: id, createdBy: req.user.userId })
  if (!job) {
    throw new NotFound(`No job with id ${id}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const createJob = async (req, res) => {
  const job = await Job.create({ ...clientFields(req.body), createdBy: req.user.userId })
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const { id } = req.params
  const updates = clientFields(req.body)
  if (updates.company === '' || updates.position === '') {
    throw new BadRequest('Company or position fields cannot be empty')
  }
  // load and save (instead of findOneAndUpdate) so document validators and hooks run
  const job = await Job.findOne({ _id: id, createdBy: req.user.userId })
  if (!job) {
    throw new NotFound(`No job with id ${id}`)
  }
  job.set(updates)
  await job.save()
  res.status(StatusCodes.OK).json({ job })
}

const deleteJob = async (req, res) => {
  const { id } = req.params
  const job = await Job.findOneAndDelete({ _id: id, createdBy: req.user.userId })
  if (!job) {
    throw new NotFound(`No job with id ${id}`)
  }
  res.status(StatusCodes.OK).json({ msg: 'Job removed' })
}

const showStats = async (req, res) => {
  const createdBy = new mongoose.Types.ObjectId(req.user.userId)
  const statusCounts = await Job.aggregate([
    { $match: { createdBy } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  const defaultStats = { pending: 0, interview: 0, declined: 0 }
  for (const { _id, count } of statusCounts) defaultStats[_id] = count

  const typeCounts = await Job.aggregate([
    { $match: { createdBy } },
    { $group: { _id: '$jobType', count: { $sum: 1 } } },
  ])
  const jobTypeStats = { 'full-time': 0, 'part-time': 0, remote: 0, internship: 0 }
  for (const { _id, count } of typeCounts) jobTypeStats[_id] = count

  // six most recent months that have applications, oldest first
  const monthly = await Job.aggregate([
    { $match: { createdBy } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 6 },
  ])
  const monthlyApplications = monthly
    .map(({ _id: { year, month }, count }) => ({
      date: new Date(Date.UTC(year, month - 1)).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      count,
    }))
    .reverse()

  res.status(StatusCodes.OK).json({ defaultStats, jobTypeStats, monthlyApplications })
}

module.exports = {
  getAllJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  showStats,
  exportJobs,
}
