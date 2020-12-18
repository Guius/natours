/*In order to get rid of try catch block, we simply wrapped our
asynchronous function inside the catchAsync function. This 
function will then return a new anonymous function which will
then be assigned to createTour*/

module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
