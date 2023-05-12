const express = require('express')
const router = express.Router()

const authenticateUser = require('../middleware/authentication')
const {
  register,
  login,
  getCurrentUser,
  updateUser,
  changePassword,
  deleteUser,
} = require('../controllers/auth')

router.post('/register', register)
router.post('/login', login)
router
  .route('/me')
  .get(authenticateUser, getCurrentUser)
  .patch(authenticateUser, updateUser)
  .delete(authenticateUser, deleteUser)
router.patch('/password', authenticateUser, changePassword)

module.exports = router
