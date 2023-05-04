const { randomUUID } = require('crypto')

// tag each request with an id (reusing the caller's when it is safe to echo back)
const requestId = (req, res, next) => {
  const incoming = req.get('X-Request-Id')
  req.id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID()
  res.set('X-Request-Id', req.id)
  next()
}

module.exports = requestId
