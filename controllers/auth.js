const { StatusCodes } = require('http-status-codes')
const User = require('../models/User')

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

module.exports = { register }
