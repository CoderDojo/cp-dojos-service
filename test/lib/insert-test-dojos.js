'use strict';

var _ = require('lodash');
var async = require('async');
var slug = require('limax');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'test-dojo-data';

  seneca.add({ role: plugin, cmd: 'insert', entity: 'dojo'}, function (args, done) {
    var dojos = require('../fixtures/e2e/dojos');
    var index = 1;
    async.eachSeries(dojos, function (dojo, sCb) {
      seneca.act({role: 'cd-users', cmd: 'list', query: {email: 'champion'+ index + '@example.com'}},
      function (err, champions){
        index ++;
        var champ = champions[0];
        seneca.act({role: 'cd-dojos', cmd: 'load_user_dojo_lead', query: {id: champ.id} }, function (err, lead) {
          dojo.dojoLeadId = lead.id;
          seneca.act({role: 'cd-dojos', cmd: 'create', dojo: dojo, user: champ}, function (err, createdDojo) {
            // Bypass the restriction on cd_dojos for verified
            createdDojo.verified = dojo.verified;
            // A champ shouldn't verify himself, but that's for test data purpose, it's not like it's checked ...
            seneca.act({role: 'cd-dojos', cmd: 'update', dojo: createdDojo, user: {id: champ.id}}, sCb);
          });
        });
      });
    }, function (err) {
      done(err);
    });
  });

  seneca.add({ role: plugin, cmd: 'insert', entity: 'user_dojo'}, function (args, done) {
    var dojoMembers = require('../fixtures/e2e/dojo-members');
    async.eachSeries(dojoMembers, function (dojoMember, sCb){
      async.waterfall([
        getDojo(dojoMember.dojo.email),
        getUser(dojoMember.email),
        getExistingMembership(dojoMember.existing),
        saveUserDojo(dojoMember, dojoMember.userTypes)
      ], sCb);

    }, done);

    function getDojo (dojoEmail) {
      return function (wfCb) {
        seneca.act({role: 'cd-dojos', cmd: 'list', query: {'email': dojoEmail} }, function (err, dojos) {
          return wfCb(null, dojos[0]);
        });
      };
    }

    function getUser (userEmail) {
      return function (dojo, wfCb) {
        seneca.act({role: 'cd-users', cmd: 'list', query: {email: userEmail}}, function (err, users) {
          return wfCb(null, dojo, users[0]);
        });
      };
    }
    function getExistingMembership (dojoMemberExists) {
      return function (dojo, user, wfCb) {
        if (dojoMemberExists) {
          seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: user.id, dojoId: dojo.id}}, function (err, dojoMembers) {
            wfCb(null, dojo, user, dojoMembers[0]);
          });
        } else {
          wfCb(null, dojo, user, null);
        }
      };
    }
    function saveUserDojo (dojoMember, userTypes) {
      return function (dojo, user, membership, wfCb) {
        var payload = {role: 'cd-dojos', cmd: 'request_user_invite', data: {user: user, dojoId: dojo.id, userType: userTypes[0], userPermissions: dojoMember.userPermissions, emailSubject: 'imabanana'}}; // By default, consider it requires approval
        if (dojoMember.approved) {
          var userDojo = {userId: user.id, userTypes: userTypes, dojoId: dojo.id, owner: dojoMember.owner, userPermissions: dojoMember.userPermissions};
          if (membership) userDojo.id = membership.id;
          payload = {role: 'cd-dojos', cmd: 'save_usersdojos', userDojo: userDojo};
        }
        seneca.act(payload, wfCb);
      };
    }
  });

  seneca.add({ role: plugin, cmd: 'insert', entity: 'dojo_lead'}, function (args, done) {
    var dojoleads = require('../fixtures/e2e/dojo-leads.json');
    async.eachSeries(dojoleads, function (lead, sCb){
      async.waterfall([
        getUser,
        saveDojoLead
      ], sCb);

      function getUser (wfCb) {
        seneca.act({ role: 'cd-users', cmd: 'list', query: {email: lead.email}}, function (err, dojoAdmins) {
          if (err) return done(err);
          return wfCb(null, dojoAdmins[0]);
        });
      }

      function saveDojoLead (dojoAdmin, wfCb) {
        lead.userId = dojoAdmin.id;
        seneca.act({ role: 'cd-dojos', cmd: 'simple_save_dojo_lead', dojoLead: lead}, wfCb);
      }
    }, done);
  });

  return {
    name: plugin
  };
};
