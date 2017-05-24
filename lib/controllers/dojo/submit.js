var async = require('async');
/**
 * Set the dojo in a state of review for a relevant entity (CDF/RB)
 *
 * @param  {Object}  args.dojo      The dojo to save
 * @return {Object}  dojo      The saved dojo
 */
module.exports = function (args, done) {
  var dojo;
  var seneca = this;
  var plugin = args.role;
  dojo = args.dojo;
  delete dojo.emailSubject;
  var usersDojosEntity = seneca.make$('cd/usersdojos');
  var user = args.user;
  var userDojo = {};
  var env = seneca.options().env;
  var zenHostname = env.hostname;
  var protocol = env.protocol;

  async.waterfall([
    // Set the initial dojo status : awaiting approval
    function (cb) {
      dojo.creator = user.id;
      dojo.creatorEmail = user.email;
      dojo.created = new Date();
      dojo.verified = 0;
      seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'save', dojo: dojo}, function (err, savedDojo) {
        if (err) return done(err);
        console.log('saveDojo', savedDojo);
        return cb(null, savedDojo);
      });
    },
    // Create the user-dojo relationship as a dojo-owner/dojo-admin
    function (savedDojo, cb) {
      userDojo.owner = 1;
      userDojo.userTypes = ['champion'];
      // add user type from users profile.
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
    },

    // Send a notification to CDF admins
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
      seneca.act({role: 'cd-dojos', ctrl: 'notifications', channel: 'email', cmd: 'send', payload: payload},
      function (err, res) {
        if (err) {
          return cb(err);
        }
        cb(null, savedDojo);
      });
    }]
    , done);
};
