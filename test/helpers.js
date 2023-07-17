process.env.JWT_SECRET ||= 'test-secret'
process.env.JWT_LIFETIME ||= '1h'

const mongoose = require('mongoose')
const app = require('../app')

const MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017'

let server
let baseUrl

// each test file runs in its own process, so the pid gives it its own database
const startServer = async () => {
  await mongoose.connect(MONGO_URI, { dbName: `jobs-test-${process.pid}` })
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`
}

const stopServer = async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
}

const api = async (method, path, { body, token } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body && JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

let userCount = 0

// registers a fresh user and returns its credentials plus token
const registerUser = async (overrides = {}) => {
  userCount += 1
  const user = {
    name: 'Test User',
    email: `user${userCount}@test.io`,
    password: 'secret123',
    ...overrides,
  }
  const res = await api('POST', '/auth/register', { body: user })
  return { ...user, token: res.body.token }
}

module.exports = { startServer, stopServer, api, registerUser }
