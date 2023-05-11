const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const { Unauthenticated } = require('../errors')

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Unauthenticated('Authentication invalid')
  }
  const token = authHeader.split(' ')[1]

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    throw new Unauthenticated('Authentication invalid')
  }

  // the token must belong to an existing user and be issued after their last password change
  const { userId, name, v = 0 } = payload
  const user =
    mongoose.isValidObjectId(userId) &&
    (await User.findById(userId).select('tokenVersion'))
  if (!user || user.tokenVersion !== v) {
    throw new Unauthenticated('Authentication invalid')
  }

  req.user = { userId, name }
  next()
}

module.exports = authenticateUser
