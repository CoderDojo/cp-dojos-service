var _ = require('lodash');
var async = require('async');
var plugin = 'cd-dojos';
var USER_DOJO_ENTITY_NS = 'cd/usersdojos';

function cmd_save_usersdojos (args, done) {
  var seneca = this;
  seneca.log.info({args: args}, 'cmd_save_usersdojos');
  var userDojo = args.userDojo;
  var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
  var originalUserDojo = null;

  // TODO: Use cp-perm
  var isCDF = args.user && _.includes(args.user.roles, 'cdf-admin');

  async.series([
    checkOriginalUsersDojo,
    hasPermissionToUpdate,
    ownerPermissionsCheck,
    canAssignProvidedUserType,
    saveUserDojo,
    saveNinjasUserDojo
  ], function (err, res) {
    if (err) return done(null, {error: err.message});
    return done(null, res[1]);
  });

  function checkOriginalUsersDojo (done) {
    if (userDojo.id && !isCDF) {
      console.log(userDojo.id);
      seneca.act({role: plugin, cmd: 'load_usersdojos', query: {id: userDojo.id}}, function (err, response) {
        if (err) return done(err);
        originalUserDojo = response && response[0] || {};
        if ((userDojo.userId && userDojo.userId !== originalUserDojo.userId) || (userDojo.dojoId && userDojo.dojoId !== originalUserDojo.dojoId)) {
          return done(new Error('You cannot change an association\'s user or dojo. newUserId: ' + userDojo.userId + ', originalUserId: ' + originalUserDojo.userId + ', newDojoId: ' + userDojo.dojoId + ', originalDojoId: ' + originalUserDojo.dojoId));
        }
        if (userDojo.owner !== originalUserDojo.owner) {
          return done(new Error('You cannot change your ownership status'));
        }
        return done();
      });
    } else {
      return done();
    }
  }

  function hasPermissionToUpdate (done) {
    if (userDojo.id && !isCDF) {
      seneca.act({role: 'cd-dojos', cmd: 'have_permissions_on_user', perm: 'dojo-admin', params: {userId: userDojo.userId}, user: args.user},
        function (err, resp) {
          if (err) return done(new Error('You do not have permission to update this association'));
          return done();
        });
    } else {
      return done();
    }
  }

  function ownerPermissionsCheck (done) {
    if (userDojo.id && !isCDF) {
      var updatedUserDojo = userDojo;
      var isDojoOwner = originalUserDojo && originalUserDojo.owner === 1;
      if (isDojoOwner) {
        var invalidUpdate = false;
        // If this user is the dojo owner, make sure that this update is not removing their permissions or user types.
        if (updatedUserDojo.userPermissions) {
          var updatedUserPermissions = _.map(updatedUserDojo.userPermissions, function (userPermission) {
            return userPermission.name;
          });
          var originalUserPermissions = _.map(originalUserDojo.userPermissions, function (userPermission) {
            return userPermission.name;
          });
          var difference = _.difference(originalUserPermissions, updatedUserPermissions);
          if (!_.isEmpty(difference)) {
            invalidUpdate = true;
          }
        }
        if (updatedUserDojo.userTypes) {
          var championUserTypeFound = _.find(updatedUserDojo.userTypes, function (userType) {
            return userType === 'champion';
          });
          if (!championUserTypeFound) invalidUpdate = true;
        }
        if (invalidUpdate) return done(new Error('Admin permissions cannot be removed from a Dojo owner.'));
      }
    }
    return done();
  }

  function canAssignProvidedUserType (done) {
    if (args.invite || userDojo.id || isCDF) {
      // No need to check if an invite is passed down (blocked by Joi, so can't come from front-end)
      return done();
    } else {
      // Not updating an existing record therefore no owner permission check is required.
      // We do need to check, however, if joining user is trying to grant themselves permissions on the dojo
      if ((userDojo.userPermissions && userDojo.userPermissions.length > 0) ||
        _.includes(userDojo.userTypes, 'champion') ||
        _.includes(userDojo.userTypes, 'mentor')) {
        return done(new Error('You can only join the Dojo as an attendee or parent/guardian.'));
      }
      async.some([
        {role: 'cd-users', cmd: 'is_self', params: {userId: userDojo.userId}, user: args.user},
        {role: 'cd-users', cmd: 'is_parent_of', params: {userId: userDojo.userId}, user: args.user}
      ], function (perm, cb) {
        seneca.act(perm, function (err, resp) {
          if (err) return cb(false);
          return cb(resp.allowed);
        });
      }, function (result) {
        if (result === true) {
          return done();
        } else {
          return done(new Error('You can only create associations for yourself or children.'));
        }
      });
    }
  }

  function saveUserDojo (done) {
    if (userDojo.userPermissions) {
      userDojo.userPermissions = _.uniq(userDojo.userPermissions, function (userPermission) {
        return userPermission.name;
      });
    }
    if (userDojo.userTypes) userDojo.userTypes = _.uniq(userDojo.userTypes);

    usersDojosEntity.save$(userDojo, done);
  }

  function saveNinjasUserDojo (done) {
    seneca.act({role: plugin, cmd: 'add_children_parent_dojo', userId: userDojo.userId, dojoId: userDojo.dojoId, user: args.user}, done);
  }
}

module.exports = cmd_save_usersdojos;
