/**
 * Remove invite emails from a dojo invites array
 * @param  {Array} invitesArray List of invites
 * @return {Array}              List of anonymised invites
 */
var _ = require('lodash');
module.exports = function (invitesArray) {
  return _.map(invitesArray, function (invite) {
    delete invite.email;
    return invite;
  });
};
