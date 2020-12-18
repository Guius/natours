// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
/*
  This makes sure that when we have a virtual property,
  (a field that is not stored in the database, but calculated from
    another value) we want this to show up whenever there is an 
    output
  */

// QUERY MIDDLEWARE
reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select:
  //     '-startLocation -ratingsAverage -ratingsQuantity -images -startDates -secretTour -guides -duration -maxGroupSize -price -difficulty -priceDiscount -description -imageCover -locations -slug -__v -durationWeeks -id'
  // }).populate({
  //   path: 'user',
  //   select: '-passwordChangedAt -__v -role'
  // });
  this.populate({
    path: 'user',
    select: '-passwordChangedAt -__v -role'
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.post('save', function(next) {
  // this points to current review
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  console.log(this.r);
});

reviewSchema.post(/^findOneAnd/, async function() {
  /*
  we need to pass the calcAverageRatings on a document
  we get the document by performing storing it on this.r in the pre middleware above
  then passing constructor on the document means we have access to all the functions including calcAverageRatings
  */
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
