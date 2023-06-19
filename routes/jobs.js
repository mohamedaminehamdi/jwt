const express = require('express')
const router = express.Router()

const { getAllJobs, createJob } = require('../controllers/jobs')

router.route('/').get(getAllJobs).post(createJob)

module.exports = router
