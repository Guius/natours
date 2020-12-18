const {
  protect,
  restrictTo
} = require('./../controllers/authController');

const {
  getAllReviews,
  createReview,
  getReview,
  updateReview,
  deleteReview,
  setTourUserIds
} = require('./../controllers/reviewController');

const express = require('express');

/*
why do we need mergeParams set to true?
it is because, by default, each router only has access to the 
params of their route
So when we do the post request on route '/', we do not have access
to the parameters of user id or tour id
so in order to get access to this parameter , we need to merge
parameters
*/

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .get(getAllReviews)
  .post(restrictTo('user'), setTourUserIds, createReview);

router
  .route('/:id')
  .get(getReview)
  .patch(restrictTo('user', 'admin'), updateReview)
  .delete(restrictTo('user', 'admin'), deleteReview);

module.exports = router;
