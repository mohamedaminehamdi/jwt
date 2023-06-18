const express = require('express')
const router = express.Router()

const { createJob } = require('../controllers/jobs')

router.route('/').post(createJob)

module.exports = router
