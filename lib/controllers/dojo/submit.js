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
  dojo = args.dojo;
  delete dojo.emailSubject;
  // TODO : refactor, direct access to an entity is discouraged from controllers
  var usersDojosEntity = seneca.make$('cd/usersdojos');
  var user = args.user;
  var userDojo = {};
  var env = seneca.options().env;
  var zenHostname = env.hostname;
  var protocol = env.protocol;

  async.waterfall([
    // Set the initial dojo status : awaiting approval
    function (cb) {
      var payload = {
        id: dojo.id,
        created: new Date(),
        verified: 0,
        deleted: 0
      };
      seneca.act({role: 'cd-dojos', entity: 'dojo', cmd: 'save', dojo: payload}, cb);
    },
    // Because the save is partial , only the partial data is returned, which is a pain
    function (updatedDojo, cb) {
      seneca.act({role: 'cd-dojos', entity: 'dojo', cmd: 'load', id: updatedDojo.id}, function (err, _dojo) {
        cb(null, _dojo);
      });
    },
    // Create the user-dojo relationship as a dojo-owner/dojo-admin
    function (savedDojo, cb) {
      seneca.act({role: 'cd-dojos', entity: 'userdojo', cmd: 'list', query: {userId: savedDojo.creator, dojoId: savedDojo.id}},
      function (err, userDojos) {
        if (err) return done(err);
        if (userDojos.length === 0) { // Really, you should have only one by then
          userDojo.owner = 1;
          userDojo.userTypes = ['champion'];
          // add user type from users profile.
          userDojo.userPermissions = [
            {title: 'Dojo Admin', name: 'dojo-admin'},
            {title: 'Ticketing Admin', name: 'ticketing-admin'}
          ];
          userDojo.deleted = 0;
          userDojo.userId = savedDojo.creator;
          userDojo.dojoId = savedDojo.id;
          usersDojosEntity.save$(userDojo, function (err, _userDojo) {
            if (err) return cb(err);
            return cb(null, savedDojo, _userDojo);
          });
        } else {
          return cb(null, savedDojo, userDojos[0]);
        }
      });
    },

    // Send a notification to CDF admins
    function (savedDojo, userDojo, cb) {
      if (user.roles.indexOf('cdf-admin') < 0) {
        var content = {
          dojoName: savedDojo.name,
          dojoLeadName: user.name,
          dojoEmail: savedDojo.email || 'without email',
          dojoLink: protocol + '://' + zenHostname + '/dashboard/dojo/' + savedDojo.urlSlug,
          applicationLink: protocol + '://' + zenHostname + '/dashboard/lead/' + savedDojo.dojoLeadId
        };
        var sendTo = seneca.options().shared.botEmail;
        var respondTo = savedDojo.creatorEmail || sendTo;
        var payload = {to: sendTo, code: 'new-dojo-', locality: 'en_US', content: content,
        from: sendTo, replyTo: respondTo, subject: 'A new Dojo has been created'};
        seneca.act({role: 'cd-dojos', ctrl: 'notifications', channel: 'email', cmd: 'send',
        payload: payload},
        function (err, res) {
          if (err) {
            seneca.log.warn('submit-dojo', err);
            return cb(err);
          }
          seneca.log.warn('submit-dojo', res);
          cb(null, savedDojo);
        });
      } else {
        cb(null, savedDojo);
      }
    }
  ], done);
};
