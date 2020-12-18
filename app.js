const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require(`./routes/tourRoutes`);
const userRouter = require(`./routes/userRoutes`);
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

// Start express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
// app.use(helmet());

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true
  })
  // cors()
);

// Set Security HTTP headers
app.use(helmet());

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:']
    }
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP
/*
rate limiter checks number of requests per IP adress and limits
it
The number should be tailored for the application
some applications will require a lot of requests, so you 
should not make it unusable for your users
 */
const limiter = rateLimit({
  // This will allow 100 requests from the same IP
  // in an hour
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour'
});
app.use('/api', limiter);

// Body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));
/*
the following line is to update user data using a front end form
rather than using our API
it is called urlencoded because the way the form sends data
to the server is also called urlencoded
so here we need this middleware to parse data coming from a url
encoded form
*/
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// mongoSanitize looks at req.body, req.queryString and req.params
// and filters out all dollar signs and dots
app.use(mongoSanitize());

// Data santization against XSS
// prevents user from inserting malicious HTML code
app.use(xss());

// prevents parameter pollution
/*
This can happen by for example setting two sort parameters in 
the url, such as {{URL}}api/v1/tours/?sort=duration&sort=price
Our code normally tries to split the sort parameter values 
, which is one string, by commas and then adding them to an array
However here, this will create an array with all the sort properties
This will cause our app to crash, which attackers can make the 
most of

The problem is that for some parameters, the app should be able
to take more than one: 
For example the following query: 
{{URL}}api/v1/tours/?duration=5&duration=9

This should be used by the end as it clears up the query string
*/
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 2) ROUTE HANDLERS
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
