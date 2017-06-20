var _ = require('lodash');
var async = require('async');
module.exports = function (args, done) {
  var seneca = this;
  var plugin = args.role;
  var dojo = args.dojo;
  var savedDojo = {};
  var user = args.user;

  async.series([
    checkDojoIsUnverified,
    setDojoVerified,
    createEmailIfNecessary,
    addKids
  ], function (err, results) {
    done(err, savedDojo);
  });
  function checkDojoIsUnverified (sCb) {
    seneca.act({role: plugin, cmd: 'load', id: dojo.id}, function (err, oldDojo) {
      if (err) return done(err);
      if (!oldDojo) return done(new Error('Dojo not found'));
      if (!oldDojo.verified) return sCb();
      return done(new Error('A dojo cannot be verified twice'));
    });
  }
  function setDojoVerified (sCb) {
    dojo.verified = 1;
    dojo.verifiedAt = new Date();
    dojo.verifiedBy = user.id;
    seneca.act({role: plugin, entity: 'dojo', cmd: 'save',
      dojo: _.pick(dojo, ['id', 'verified', 'verifiedAt', 'verifiedBy']) },
      function (err, verifiedDojo) {
        savedDojo = verifiedDojo;
        sCb(err);
      });
  }
  // create CD Organization(@coderdojo.com) email address for the dojo if the dojo has no email already set
  function createEmailIfNecessary (sCb) {
    if (!dojo.email) {
      seneca.act({
        role: plugin,
        cmd: 'create_dojo_email',
        dojo: dojo
      }, function (err, organizationEmail) {
        if (err) {
          return done(err);
        }
        if (organizationEmail) {
          dojo.email = organizationEmail.primaryEmail;
        }
        sCb(null, dojo);
      });
    } else {
      sCb(null, dojo);
    }
  }
  // Add every dojo's user's kid to the dojo.
  function addKids (sCb) {
    async.waterfall([
      getDojoUsers,
      addUsersKids
    ], sCb);
    function getDojoUsers (wfCb) {
      seneca.act({role: plugin, cmd: 'load_dojo_users', dojoId: dojo.id},
      function (err, dojoUsers) {
        if (err) return done(err);
        return wfCb(null, dojoUsers.response);
      });
    }
    function addUsersKids (profiles, wfCb) {
      async.each(profiles, function (profile, eCb) {
        if (profile.children && profile.children.length > 0) {
          seneca.act({role: plugin, cmd: 'add_children_parent_dojo', userId: profile.userId,
          dojoId: dojo.id, invite: {}}, function (err) {
            if (err) return done(err);
            eCb();
          });
        } else {
          eCb(null);
        }
      }, function () {
        wfCb();
      });
    }
  }
};
