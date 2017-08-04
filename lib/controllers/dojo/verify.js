var _ = require('lodash');
var async = require('async');
/**
 * Verify a Dojo and set its verification informations
 * @param  {String}   id  the Dojo id
 * @return {Object}        the saved Dojo
 */
module.exports = function (args, done) {
  var seneca = this;
  var plugin = args.role;
  var dojoId = args.id;
  var dojo = {};
  var user = args.user;
  var verify = args.verified;

  async.series([
    checkDojoState,
    setDojoVerified,
    function (sCb) {
      if (verify) {
        addKids(sCb);
      } else {
        sCb();
      }
    }
  ], function (err, results) {
    done(err, dojo);
  });
  function checkDojoState (sCb) {
    seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, _dojo) {
      if (err) return done(err);
      if (!_dojo) return done(new Error('Dojo not found'));
      if ((!_dojo.verified && verify) || (_dojo.verified && !verify)) {
        dojo = _dojo;
        return sCb();
      } else {
        return done(new Error('Invalid verification scenario'));
      }
    });
  }
  function setDojoVerified (sCb) {
    var payload = {
      id: dojo.id,
      verified: verify
    };
    if (verify) {
      payload.verifiedAt = new Date();
      payload.verifiedBy = user.id;
      payload.stage = 1;
    }
    seneca.act({role: plugin, entity: 'dojo', cmd: 'save',
      dojo: payload },
      function (err, verifiedDojo) {
        dojo = verifiedDojo;
        sCb(err);
      });
  }
  // Add every dojo's user's kid to the dojo.
  function addKids (sCb) {
    async.waterfall([
      getDojoUsers,
      addUsersKids
    ], sCb);
    function getDojoUsers (wfCb) {
      seneca.act({role: plugin, cmd: 'load_dojo_users', query: {dojoId: dojo.id}},
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
