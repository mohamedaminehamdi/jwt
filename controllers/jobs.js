const { StatusCodes } = require('http-status-codes')
const Job = require('../models/Job')
const { BadRequest, NotFound } = require('../errors')

const getAllJobs = async (req, res) => {
  const jobs = await Job.find({ createdBy: req.user.userId }).sort('-createdAt')
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

module.exports = { getAllJobs, getJob, createJob, updateJob }
