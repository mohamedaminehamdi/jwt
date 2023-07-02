const express = require('express')
const router = express.Router()

const authenticateUser = require('../middleware/authentication')
const {
  register,
  login,
  getCurrentUser,
  updateUser,
} = require('../controllers/auth')

router.post('/register', register)
router.post('/login', login)
router
  .route('/me')
  .get(authenticateUser, getCurrentUser)
  .patch(authenticateUser, updateUser)

module.exports = router
