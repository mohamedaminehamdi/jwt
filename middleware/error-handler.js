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
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue).join(', ')
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: `Duplicate value entered for ${fields}, please choose another value` })
  }
  if (err.name === 'CastError') {
    if (err.path === '_id') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `No item found with id ${err.value}` })
    }
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: `Invalid value for ${err.path}` })
  }
  // body-parser errors: malformed JSON (400), body too large (413)
  if (err.expose && err.status < 500) {
    return res.status(err.status).json({ msg: err.message })
  }
  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json({ msg: 'Something went wrong, please try again later' })
}

module.exports = errorHandlerMiddleware
