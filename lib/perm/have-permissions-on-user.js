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
  var targetUserId = args.params.userId;
  if(_.isUndefined(targetUserId) && args.params.query) targetUserId = args.params.query.userId;
  if(_.isUndefined(targetUserId) && args.params.data) targetUserId = args.params.data.userId;
  var perm = args.perm;
  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  if (userId && targetUserId) {
    async.parallel({
      actorUsersDojos: function (cb) {
        seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: userId}, function (err, response) {
          if (err) return cb(err);
          return cb(null, response);
        });
      },
      targetUsersDojos: function (cb) {
        seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: targetUserId}, function (err, response) {
          if (err) return cb(err);
          return cb(null, response);
        });
      }
    }, function (err, results) {
      if (err) return done(null, {'allowed': false});
      var isAllowed = false;
      var specifiedPermOf = results.actorUsersDojos.filter(function (usersDojo) {
        return _.includes(_.map(usersDojo.userPermissions, 'name'), perm);
      }).map(function (usersDojo) {
        return usersDojo.dojoId;
      });

      var targetMemberOf = _.map(results.targetUsersDojos, 'dojoId');

      if (_.intersection(specifiedPermOf, targetMemberOf).length > 0) {
        isAllowed = true;
      } else {
        isAllowed = false;
      }
      done(null, {'allowed': isAllowed});
    });
  } else {
    done(null, {'allowed': false});
  }
}

module.exports = havePermissionsOnUser;
