module.exports = function (dojo) {
  if (dojo.eventbriteToken && dojo.eventbriteWhId) dojo.eventbriteConnected = true;
  delete dojo.eventbriteToken;
  delete dojo.eventbriteWhId;
  return dojo;
}
