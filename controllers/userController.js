const multer = require('multer');
const sharp = require('sharp');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');

const User = require('./../models/userModel');
const AppError = require('../utils/appError');

const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // filename format must make sure that they are unique and that one will not override the other
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

// this way, the image will be stored as a buffer
const multerStorage = multer.memoryStorage();

// the goal of this function is to check if the upload is an image
// if it is, then we will pass false in the callback function
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

/*
we are not uploading these photos directly to our databse, 
we are just uploading them to our file system and in our database we just have a reference to the image
------------------
with this upload variable what we are really doing is adding a middleware 
*/
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

/*
.single() because we only want to update a single photo
and in single() we pass the name of the field that is going to have the photo to upload
this middleware will basically take the file from the 'photo' field and save it to the destination we have specified above

*/
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  /*
  we are adding the file like this because right now req.file.filename is not defined
  but we need it to be defined because when we add it to the database below, we need req.file.filename
  */
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /login '
  });
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // 3) Filtered out unwanted fields names that are not allowed to be updated
  /*
  we are not setting the data to req.body because that would
  allow anyone to change details such as the role, and set 
  themselves as admin
  so we are only going to allow to change name and email, seeing
  as they are the only ones we want to allow to change
  */
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Do NOT update passwords with this! as the middleware functions
// only work with .save()
exports.updateUser = factory.updateOne(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
exports.getAllUsers = factory.getAll(User);
