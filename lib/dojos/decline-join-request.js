var _ = require('lodash');
var async = require('async');
function cmd_accept_user_request (args, done) {
  var seneca = this;
  var plugin = args.role;
  var tokenData = args.data;
  var currentUserId = args.user.id;
  if (!args.user) return done();
  var inviteTokenId = tokenData.inviteToken;
  var requestedByUser = tokenData.requestedByUser;

  async.waterfall([
    loadUser,
    verifyRequest,
    removeJoinRequests
  ], function (err, res) {
    if (err) return done(null, {error: err.message});
    return done(null, res);
  });

  function loadUser (done) {
    seneca.act({role: 'cd-users', cmd: 'load', id: requestedByUser, user: args.user}, function (err, response) {
      if (err) return done(err);
      var user = response;
      var joinRequests = user.joinRequests;
      var validRequestFound = _.find(joinRequests, {id: inviteTokenId});
      if (!validRequestFound) return done(new Error('Join request not found'));
      return done(null, validRequestFound);
    });
  }

  function verifyRequest (validRequestFound, done) {
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

  function removeJoinRequests (done) {
    seneca.act({role: 'cd-users', cmd: 'load', id: requestedByUser, user: args.user}, function (err, user) {
      if (err) return done(err);
      user.joinRequests = _.without(user.joinRequests, _.find(user.joinRequests, {id: inviteTokenId}));
      var toBeUpdated = _.pick(user, ['id', 'joinRequests']);
      seneca.act({role: 'cd-users', cmd: 'update', user: toBeUpdated, id: user.id}, done);
    });
  }
}

module.exports = cmd_accept_user_request;
