const express = require('express')
const router = express.Router()

const { getAllJobs, getJob, createJob } = require('../controllers/jobs')

router.route('/').get(getAllJobs).post(createJob)
router.route('/:id').get(getJob)

module.exports = router
