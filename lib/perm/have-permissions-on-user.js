var async = require('async');
var _ = require('lodash');

/**
 * Verify that the logged in user has a necessary permission on a Dojo that the target user is a
 * member of. If you have a dojoId, use have-permisions-on-dojo.js instead.
 * @param  {Object}   args Contains the user, the userId of the target user and the perm to test
 * @return {Boolean}        isAllowed, True/false
 */
function havePermissionsOnUser (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var targets = [];
  var targetUserId = args.params.userId;
  if (_.isUndefined(targetUserId) && args.params.query) targetUserId = args.params.query.userId;
  if (_.isUndefined(targetUserId) && args.params.data) targetUserId = args.params.data.userId;
  if (_.isUndefined(targetUserId) && args.params.userIds) targets = _.uniq(args.params.userIds);
  if (targetUserId && !targets.length) targets = [targetUserId];
  var perm = args.perm;
  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  var actorUsersDojos;
  if (userId && targets.length) {
    seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: userId, deleted: 0}, function (err, response) {
      if (err) return done(err);
      actorUsersDojos = response;
      async.every(targets, isUserAllowed, function (res) {
        if (!res) return done(null, {'allowed': false});
        done(null, {'allowed': res});
      });
    });
  } else {
    done(null, {'allowed': false});
  }

  function isUserAllowed (targetUserId, everyCb) {
    seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: targetUserId, deleted: 0}, function (err, response) {
      if (err) return everyCb(null, false);
      var isAllowed = false;
      var specifiedPermOf = actorUsersDojos.filter(function (usersDojo) {
        return _.includes(_.map(usersDojo.userPermissions, 'name'), perm);
      }).map(function (usersDojo) {
        return usersDojo.dojoId;
      });

      var targetMemberOf = _.map(response, 'dojoId');

      if (_.intersection(specifiedPermOf, targetMemberOf).length > 0) {
        isAllowed = true;
      } else {
        isAllowed = false;
      }
      everyCb(isAllowed);
    });
  }
}

module.exports = havePermissionsOnUser;
