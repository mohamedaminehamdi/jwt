require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

const connectDB = require('./db/connect');
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
app.use(helmet());
app.use(cors());
app.use(express.static('./public'));
app.use(express.json({ limit: '10kb' }));

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/jobs', authenticateUser, jobsRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

start();
