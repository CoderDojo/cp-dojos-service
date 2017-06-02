var _ = require('lodash');
var async = require('async');
module.exports = function (args, done) {
  var seneca = this;
  var plugin = args.role;
  var dojo = args.dojo;

  async.series([
    setDojoVerified,
    createEmailIfNecessary,
    addKids
  ], function (err, results) {
    done(err, results[_.last(_.keys(results))]);
  });
  function setDojoVerified (sCb) {
    dojo.verified = 1;
    dojo.verifiedAt = new Date();
    dojo.verifiedBy = args.user.id;
    seneca.act({role: plugin, entity: 'dojo', cmd: 'save',
      dojo: _.pick(dojo, ['id', 'verified', 'verifiedAt', 'verifiedBy']) }, sCb);
  }
  // create CD Organization(@coderdojo.com) email address for the dojo if the dojo has no email already set
  function createEmailIfNecessary (sCb) {
    if (!dojo.email) {
      seneca.act({
        role: plugin,
        cmd: 'create_dojo_email',
        dojo: dojo,
        subject: emailSubject // NOTE uh?
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
  function addKids (sCb) {
    async.waterfall([
      getDojoUsers,
      getUsersProfiles,
      addUsersKids
    ], sCb);
    function getDojoUsers (wfCb) {
      seneca.act({role: plugin, cmd: 'load_dojo_users', dojoId: dojo.id},
      function (err, dojoUsers) {
        if (err) return done(err);
        return done(null, dojoUsers);
      });
    }
    function getUsersProfiles (dojoUsers, wfCb) {
      seneca.act({role: 'cd-profiles', cmd: 'list', query: {userId: {in$: _.map(dojoUsers, 'userId')}}},
      function (err, profiles) {
        if (err) return done(err);
        return done(null, profiles);
      });
    }
    function addUsersKids (profiles, wfCb) {
      async.each(profiles, function (profile, eCb) {
        if (profile.children.length > 0) {
          seneca.act({role: plugin, cmd: 'add_children_parent_dojo', userId: profile.userId,
          dojoId: dojo.id}, function (err) {
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
