'use strict';

var _ = require('lodash');
var async = require('async');
var slug = require('limax');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'test-dojo-data';

  seneca.add({role: plugin, cmd: 'insert', entity: 'dojo'}, function (args, done) {
    var dojos = require('../fixtures/e2e/dojos');
    var index = 1;
    async.eachSeries(dojos, function (dojo, sCb) {
      seneca.act({role: 'cd-users', cmd: 'list', query: {email: 'champion' + index + '@example.com'}},
      function (err, champions) {
        index ++;
        var champ = champions[0];
        seneca.act({role: 'cd-dojos', entity: 'lead', cmd: 'load', query: {id: champ.id}}, function (err, lead) {
          dojo.dojoLeadId = lead.id;
          //The f-end is supposed to add *isValid* field to each step
          _.each(lead.application, function (step) {
            step.isValid = true;
          });
          seneca.act({role: 'cd-dojos', ctrl: 'lead', cmd: 'submit', lead: lead, user: champ, locality: 'en_US'},
           function (err, submittedLead) {
            if (err) return done(err);
            seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'verify', verified: 1, id: submittedLead.application.dojo.id, user: {id: '42'}},
             function (err, dojo) {
              if (err) return done(err);
              sCb();
            });
          });
        });
      });
    }, function (err) {
      done(err);
    });
  });

  seneca.add({role: plugin, cmd: 'insert', entity: 'user_dojo'}, function (args, done) {
    var dojoMembers = require('../fixtures/e2e/dojo-members');
    async.eachSeries(dojoMembers, function (dojoMember, sCb) {
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
          payload = {role: 'cd-dojos', cmd: 'save_usersdojos', userDojo: userDojo, user: {roles: ['cdf-admin']}};
        }
        seneca.act(payload, wfCb);
      };
    }
  });

  seneca.add({role: plugin, cmd: 'insert', entity: 'dojo_lead'}, function (args, done) {
    var dojoleads = require('../fixtures/e2e/dojo-leads.json');
    async.eachSeries(dojoleads, function (lead, sCb) {
      async.waterfall([
        getUser,
        saveDojoLead
      ], sCb);

      function getUser (wfCb) {
        seneca.act({role: 'cd-users', cmd: 'list', query: {email: lead.email}}, function (err, dojoAdmins) {
          if (err) return done(err);
          return wfCb(null, dojoAdmins[0]);
        });
      }

      function saveDojoLead (dojoAdmin, wfCb) {
        lead.userId = dojoAdmin.id;
        seneca.act({role: 'cd-dojos', ctrl: 'lead', cmd: 'save', lead: lead, user: {id: lead.userId, email: lead.email}}, wfCb);
      }
    }, done);
  });

  seneca.add({role: plugin, cmd: 'insert', entity: 'poll'}, function (args, done) {
    var polls = require('../fixtures/e2e/polls.json');
    var newDate = new Date();
    newDate.setMonth(newDate.getMonth() + 3);
    async.eachSeries(polls, function (poll, sCb) {
        if (!poll.endDate) poll.endDate = newDate;
        seneca.act({role: 'cd-dojos', cmd: 'save_poll_setup', poll: poll}, sCb);
    }, done);
  });


  return {
    name: plugin
  };
};
