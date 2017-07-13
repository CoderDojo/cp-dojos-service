module.exports = function (dojo) {
  delete dojo.eventbriteToken;
  delete dojo.eventbriteWhId;
  return dojo;
}
