const { StatusCodes } = require('http-status-codes')
const User = require('../models/User')
const { BadRequest, Unauthenticated, NotFound } = require('../errors')

const userResponse = (user) => ({
  name: user.name,
  email: user.email,
  location: user.location,
})

const register = async (req, res) => {
  const { name, email, password } = req.body
  const user = await User.create({ name, email, password })
  res
    .status(StatusCodes.CREATED)
    .json({ user: userResponse(user), token: user.createJWT() })
}

const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    throw new BadRequest('Please provide email and password')
  }
  const user = await User.findOne({ email })
  if (!user || !(await user.comparePassword(password))) {
    throw new Unauthenticated('Invalid credentials')
  }
  res
    .status(StatusCodes.OK)
    .json({ user: userResponse(user), token: user.createJWT() })
}

const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.userId)
  if (!user) {
    throw new NotFound('User no longer exists')
  }
  res.status(StatusCodes.OK).json({ user: userResponse(user) })
}

module.exports = { register, login, getCurrentUser }
