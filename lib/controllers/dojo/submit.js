var async = require('async');
var _ = require('lodash');
module.exports = function (args, done) {
  var dojo;
  var seneca = this;
  var plugin = args.role;
  dojo = args.dojo;
  delete dojo.emailSubject;
  var usersDojosEntity = seneca.make$('cd/usersdojos');
  var user = args.user;
  var userDojo = {};
  var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';
  var protocol = process.env.HOSTNAME ? 'https' : 'http';

  dojo.creator = user.id;
  dojo.creatorEmail = user.email;
  dojo.created = new Date();
  dojo.verified = 0;
  async.waterfall([
    function (cb) {
      seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'save', dojo: dojo}, function (err, savedDojo) {
        if (err) return done(err);
        console.log('saveDojo', savedDojo);
        return cb(null, savedDojo);
      });
    },
    function (savedDojo, cb) {
      userDojo.owner = 1;
      userDojo.userTypes = ['champion'];
      // add user type from users profile.
      seneca.act({role: 'cd-profiles', cmd: 'list', query: {userId: user.id}}, function (err, response) {
        if (err) return cb(err);
        var profile = response[0];
        userDojo.userTypes.push(profile.userType);
        userDojo.userTypes = _.uniq(userDojo.userTypes);
        userDojo.userPermissions = [
          {title: 'Dojo Admin', name: 'dojo-admin'},
          {title: 'Ticketing Admin', name: 'ticketing-admin'}
        ];
        userDojo.deleted = 0;
        userDojo.userId = user.id;
        userDojo.dojoId = savedDojo.id;
        usersDojosEntity.save$(userDojo, function (err, userDojo) {
          if (err) return cb(err);
          cb(null, savedDojo, userDojo);
        });
      });
    },
    function (savedDojo, userDojo, cb) {
      var content = {
        dojoName: savedDojo.name,
        dojoLeadName: user.name,
        dojoEmail: savedDojo.email || 'without email',
        dojoLink: protocol + '://' + zenHostname + '/dashboard/dojo/' + savedDojo.urlSlug,
        applicationLink: protocol + '://' + zenHostname + '/dashboard/champion-applications/' + savedDojo.dojoLeadId
      };
      var sendTo = seneca.options().shared.botEmail;
      var respondTo = user.email || sendTo;
      var payload = {to: sendTo, code: 'new-dojo-', locality: 'en_US', content: content, from: sendTo, replyTo: respondTo, subject: 'A new dojo has been created'};
      seneca.act({role: plugin, cmd: 'send_email', payload: payload}, function (err, res) {
        if (err) {
          return cb(err);
        }
        cb(null, savedDojo);
      });
    }]
    , done);
};
