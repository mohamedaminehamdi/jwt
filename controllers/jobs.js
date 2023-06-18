const { StatusCodes } = require('http-status-codes')
const Job = require('../models/Job')

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

module.exports = { createJob }
