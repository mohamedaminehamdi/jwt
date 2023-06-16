const express = require('express')
const router = express.Router()

const authenticateUser = require('../middleware/authentication')
const { register, login, getCurrentUser } = require('../controllers/auth')

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticateUser, getCurrentUser)

module.exports = router
