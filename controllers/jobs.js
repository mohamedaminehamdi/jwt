const { StatusCodes } = require('http-status-codes')
const Job = require('../models/Job')
const { NotFound } = require('../errors')

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

module.exports = { getAllJobs, getJob, createJob }
