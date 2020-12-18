const AppError = require('../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicate field value: ${value}. Use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = err =>
  new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = err =>
  new AppError('Your token has expired. Please log in again', 401);

const sendErrorDev = (err, req, res) => {
  /*
  we want to check if the url starts /api 
  in which case we want to send back a normal error log
  if the url starts without api, then we want
  to render a proper website page
  */
  //  req.originalURL is the whole url without the host
  // makes it look like a route
  /*
  Of course we could have a seperate error handler for our 
  rendered pages by (new RenderError('msg', statusCode))
  */
  if (req.originalUrl.startsWith('/api')) {
    console.log('hello from the correct if block');
    // A) API
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }
  // B) RENDERED WEBSITE
  console.log('ERROR! 💣', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  // Operational, trusted error: send message to client
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });

      //   Programming or other unknwon error: don't leak error details
    }
    //   1) log error
    console.error('ERROR 💣', err);

    //   2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong'
    });
  }
  // B) RENDERED WEBSITE
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went very wrong!',
      msg: err.message
    });
  }
  //   Programming or other unknwon error: don't leak error details
  //   1) log error
  console.error('ERROR 💣', err);

  //   2) Send generic message
  return res.status(500).render('error', {
    title: 'Something went wrong',
    msg: 'Please try again later'
  });
};

module.exports = (err, req, res, next) => {
  // the status code is as is if it is defined, or else it will be 500
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastErrorDB(error);

    if (error.code === 11000) error = handleDuplicateFieldsDB(error);

    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);

    if (err.name === 'JsonWebTokenError') error = handleJWTError(error);

    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError(error);

    sendErrorProd(error, req, res);
  }
};
