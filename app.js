require('dotenv').config();
require('express-async-errors');

const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUI = require('swagger-ui-express');
const openapi = require('./docs/openapi.json');
const app = express();

const connectDB = require('./db/connect');
const requestId = require('./middleware/request-id');
const authenticateUser = require('./middleware/authentication');
const authRouter = require('./routes/auth');
const jobsRouter = require('./routes/jobs');
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

app.set('trust proxy', 1);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many requests, please try again later' },
});

// middleware
app.use(requestId);
morgan.token('id', (req) => req.id);
app.use(
  morgan(':id :method :url :status :res[content-length] - :response-time ms', {
    skip: () => process.env.NODE_ENV === 'test',
  })
);
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.static('./public'));
app.use(express.json({ limit: '10kb' }));

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(openapi));
app.get('/api/v1/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'error',
    db: connected ? 'connected' : 'disconnected',
  });
});
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/jobs', authenticateUser, jobsRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 3000;

const start = async () => {
  const missing = ['MONGO_URI', 'JWT_SECRET'].filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  try {
    await connectDB(process.env.MONGO_URI);
    const server = app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );

    // finish in-flight requests, then close the db (docker stop sends SIGTERM)
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

// only start the server when run directly (tests import the app)
if (require.main === module) {
  start();
}

module.exports = app;
