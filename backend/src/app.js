const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// Standard Middlewares
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '5mb' }));

// Mount All Modular API Routes (/api and /api/v1 alias)
app.use('/api', apiRoutes);
app.use('/api/v1', apiRoutes);

// 404 Route Fallback
app.use((req, _res, next) => {
  next(
    new AppError(
      `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan pada Kalawa Service API.`,
      404,
      'ENDPOINT_NOT_FOUND'
    )
  );
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
