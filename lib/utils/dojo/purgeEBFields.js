/**
 * Remove "private" EB fields
 * @param  {Object} dojo
 * @return {Object}      dojo
 */
module.exports = function (dojo) {
  if (dojo.eventbriteToken && dojo.eventbriteWhId) dojo.eventbriteConnected = true;
  if (dojo.eventbrite_token && dojo.eventbrite_wh_id) dojo.eventbriteConnected = true;
  delete dojo.eventbriteToken;
  delete dojo.eventbriteWhId;
  // Due to non-necessarly conversion to camelCase (direct connection to pg), fields are also removed when in snake_case
  delete dojo.eventbrite_token;
  delete dojo.eventbrite_wh_id;
  return dojo;
};
