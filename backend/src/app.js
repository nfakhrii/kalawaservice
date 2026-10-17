const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

// 404 Route Handler
app.use((req, _res, next) => {
  next(
    new AppError(
      `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan pada Kalawa Service API.`,
      404,
      'ENDPOINT_NOT_FOUND'
    )
  );
});

// Global Defensive Error Handler
app.use(errorHandler);

module.exports = app;

