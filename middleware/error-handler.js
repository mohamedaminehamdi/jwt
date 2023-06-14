const { CustomAPIError } = require('../errors')
const { StatusCodes } = require('http-status-codes')

const errorHandlerMiddleware = (err, req, res, next) => {
  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({ msg: err.message })
  }
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ')
    return res.status(StatusCodes.BAD_REQUEST).json({ msg })
  }
  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json({ msg: 'Something went wrong, please try again later' })
}

module.exports = errorHandlerMiddleware
