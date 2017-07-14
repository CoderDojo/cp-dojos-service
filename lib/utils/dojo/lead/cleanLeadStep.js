module.exports = function (step) {
  delete step.isValid;
  delete step.visited;
  return step;
};
