var _ = require('lodash');
var async = require('async');
module.exports = function (args, done) {
  var seneca = this;
  var plugin = args.role;
  if (!args.user) return done();
  var currentUserId = args.user.id;
  var inviteTokenId = args.inviteToken;
  var requestedByUser = args.requestedByUser;

  async.waterfall([
    loadUser,
    verifyRequest,
    updateUser,
    tidyUpJoinRequests
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

  function updateUser (joinRequest, done) {
    // Add type to userTypes in cd/usersdojos.
    // Add user to dojo users if not already added.
    var userDojo = {};
    seneca.act({
      role: plugin,
      cmd: 'load_usersdojos',
      query: {userId: requestedByUser, dojoId: joinRequest.dojoId}
    }, function (err, response) {
      if (err) return done(err);
      if (_.isEmpty(response)) {
        userDojo.owner = 0;
        userDojo.userId = requestedByUser;
        userDojo.dojoId = joinRequest.dojoId;
        userDojo.userTypes = [];
        userDojo.userTypes.push(joinRequest.userType);
      } else {
        // Update cd/usersdojos
        userDojo = response[0];
        if (!userDojo.userTypes) userDojo.userTypes = [];
        userDojo.userTypes.push(joinRequest.userType);
      }
      // If invite token user type is champion, update user permissions
      if (joinRequest.userType === 'champion') {
        userDojo.userPermissions = [
          {title: 'Dojo Admin', name: 'dojo-admin'},
          {title: 'Ticketing Admin', name: 'ticketing-admin'}
        ];
      }
      seneca.act({role: plugin, cmd: 'save_usersdojos', userDojo: userDojo, user: args.user, invite: joinRequest}, done);
    });
  }

  function tidyUpJoinRequests (userDojo, done) {
    seneca.act({role: 'cd-users', cmd: 'load', id: requestedByUser, user: args.user}, function (err, user) {
      if (err) return done(err);
      user.joinRequests = _.without(user.joinRequests, _.find(user.joinRequests, {id: inviteTokenId}));
      var toBeUpdated = _.pick(user, ['id', 'joinRequests']);
      seneca.act({role: 'cd-users', cmd: 'update', user: toBeUpdated, id: user.id}, done);
    });
  }
};
