const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

/*
This works because of closures, meaning that the inner function 
will get access to the variables of the outer function
even after the outer function has already returned
*/

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(
      req.params.id
    );

    if (!doc) {
      return next(
        new AppError('No document found with that ID', 404)
      );
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!doc) {
      return next(
        new AppError('No document found with that ID', 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    /*
    Using populate creates a new query, which might affect 
    performance
    so if you only do it once or twice in a small application,
    that will not do too much damage
    */

    /*
    Because not all getOne functions have populate options,
    we will first create the query and add to it a populate only 
    if there are populateOptions indicated
    */

    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(
        new AppError('No document found with that ID', 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    //   to allow for nexted GET reviews on tour
    let filter = {};
    if (req.params.tourId)
      filter = { tour: req.params.tourId };

    // EXECUTE THE QUERY
    const features = new APIFeatures(
      Model.find(filter),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        doc
      }
    });
  });
