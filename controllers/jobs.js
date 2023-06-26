const { StatusCodes } = require('http-status-codes')
const Job = require('../models/Job')
const { BadRequest, NotFound } = require('../errors')

const getAllJobs = async (req, res) => {
  const { status, jobType } = req.query
  const queryObject = { createdBy: req.user.userId }
  if (status && status !== 'all') queryObject.status = status
  if (jobType && jobType !== 'all') queryObject.jobType = jobType

  const jobs = await Job.find(queryObject).sort('-createdAt')
  res.status(StatusCodes.OK).json({ jobs, count: jobs.length })
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
