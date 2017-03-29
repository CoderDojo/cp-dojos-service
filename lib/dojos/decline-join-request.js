var _ = require('lodash');
var async = require('async');
function cmd_accept_user_request (args, done) {
  var seneca = this;
  var plugin = args.role;
  if (!args.user) return done(new Error('Missing parameter for cmd_accept_user_request'));
  var currentUserId = args.user.id;
  var inviteTokenId = args.inviteToken;
  var requestedByUser = args.requestedByUser;
  var user = {};
  async.waterfall([
    verifyJoinRequest,
    checkPerms,
    removeJoinRequests
  ], function (err, res) {
    if (err) return done(null, {error: err.message});
    return done(null, res);
  });

  function verifyJoinRequest (done) {
    seneca.act({role: 'cd-users', cmd: 'load', id: requestedByUser, user: args.user}, function (err, response) {
      if (err) return done(err);
      user = response;
      var joinRequests = user.joinRequests;
      var validRequestFound = _.find(joinRequests, {id: inviteTokenId});
      if (!validRequestFound) return done(new Error('Join request not found'));
      return done(null, validRequestFound);
    });
  }

  function checkPerms (validRequestFound, done) {
    // Make sure current user is dojo admin.
    var dojoId = validRequestFound.dojoId;
    seneca.act({
      role: plugin,
      cmd: 'load_usersdojos',
      query: {userId: currentUserId, dojoId: dojoId}
    }, function (err, usersDojos) {
      if (err) return done(err);
      var dojoAdminError = new Error('You must have the Dojo Admin permission to accept user join requests.');
      if (!usersDojos.length) return done(dojoAdminError);
      var userDojo = usersDojos[0];
      var dojoAdminPermissionFound = _.find(userDojo.userPermissions, function (userPermission) {
        return userPermission.name === 'dojo-admin';
      });
      if (!dojoAdminPermissionFound) return done(dojoAdminError);
      return done(null, validRequestFound);
    });
  }

  function removeJoinRequests (validRequestFound, done) {
    user.joinRequests = _.without(user.joinRequests, validRequestFound);
    var toBeUpdated = _.pick(user, ['id', 'joinRequests']);
    seneca.act({role: 'cd-users', cmd: 'update', user: toBeUpdated, id: user.id}, done);
  }
}

module.exports = cmd_accept_user_request;
