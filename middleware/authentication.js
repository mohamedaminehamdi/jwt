const jwt = require('jsonwebtoken')
const { Unauthenticated } = require('../errors')

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Unauthenticated('Authentication invalid')
  }
  const token = authHeader.split(' ')[1]

  try {
    const { userId, name } = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { userId, name }
  } catch (error) {
    throw new Unauthenticated('Authentication invalid')
  }
  next()
}

module.exports = authenticateUser
