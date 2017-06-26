var async = require('async');
var _ = require('lodash');
var cleanLeadStep = require('../../utils/dojo/lead/cleanLeadStep');
/**
 * Submit a lead and all its dependencies
 * Dependencies being : champion profile, dojo, charter
 * @param  {Object}   args.lead  The lead to submit
 */
module.exports = function (args, done) {
  var seneca = this;
  var user = args.user;
  var lead = args.lead;
  // TODO : remove the whole lead to only take the id
  // /submit/:id
  var newLead = {};
  var env = seneca.options().env;
  var zenHostname = env.hostname;
  var protocol = env.protocol;
  // This is relatively unecessary as Joi is forcing you to have them valid
  if (!_.every(lead.application, ['isValid', true])) {
    return done(new Error('Incomplete application'));
  }
  // At that point, we expect
  // - the charter to have been signed
  // - the champion profile to have been completed
  // - the dojo to have been created (but awaiting approval)
  async.waterfall([
    function (wCb) {
      // We set our flag as completed
      seneca.act({role: 'cd-dojos', entity: 'lead', cmd: 'save', lead: {id: lead.id, completed: true}, user: args.user}, function (err, lead) {
        if (err) return done(err);
        newLead = lead;
        return wCb();
      });
    },
    // Create the dojo-admin relationship
    function (wCb) {
      var dojo = lead.application.dojo;
      dojo = cleanLeadStep(dojo);
      seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'submit', dojo: dojo, user: user}, function (err, dojo) {
        if (err) return done(err);
        newLead.application.dojo = dojo;
        return wCb(dojo);
      });
    },
    // Send a notification to the user that his dojo request is awaiting approval
    function (dojo, wCb) {
      var from = seneca.options().shared.botEmail;
      var content = {
        name: args.user.name,
        eventsUrl: protocol + '://' + zenHostname + '/dashboard/my-dojos/' + dojo.id + '/events',
        usersUrl: protocol + '://' + zenHostname + '/dashboard/my-dojos/' + dojo.id + '/users'
      };
      var payload = {to: lead.application.champion.email, code: 'dojo-submitted-',
       locality: args.locality, content: content,
       from: from, replyTo: from, subject: 'A new dojo has been created'};
      seneca.act({role: 'cd-dojos', ctrl: 'notifications', channel: 'email', cmd: 'send', payload: payload}, wCb);
    }
  ], function () {
    done(null, newLead);
  });
};
