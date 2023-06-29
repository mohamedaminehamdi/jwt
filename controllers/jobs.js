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

const getAllJobs = async (req, res) => {
  const { status, jobType, search, sort } = req.query
  const queryObject = { createdBy: req.user.userId }
  if (status && status !== 'all') queryObject.status = status
  if (jobType && jobType !== 'all') queryObject.jobType = jobType
  if (search) {
    queryObject.position = new RegExp(escapeRegex(String(search)), 'i')
  }

  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)

  const [jobs, totalJobs] = await Promise.all([
    Job.find(queryObject)
      .sort(sortOptions[sort] || sortOptions.latest)
      .skip((page - 1) * limit)
      .limit(limit),
    Job.countDocuments(queryObject),
  ])
  res
    .status(StatusCodes.OK)
    .json({ jobs, totalJobs, numOfPages: Math.ceil(totalJobs / limit) })
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
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const { id } = req.params
  const { createdBy, ...updates } = req.body
  if (updates.company === '' || updates.position === '') {
    throw new BadRequest('Company or position fields cannot be empty')
  }
  const job = await Job.findOneAndUpdate(
    { _id: id, createdBy: req.user.userId },
    updates,
    { new: true, runValidators: true }
  )
  if (!job) {
    throw new NotFound(`No job with id ${id}`)
  }
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

module.exports = { getAllJobs, getJob, createJob, updateJob, deleteJob }
