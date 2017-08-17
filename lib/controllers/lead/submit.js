var async = require('async');
var _ = require('lodash');
var cleanLeadStep = require('../../utils/dojo/lead/cleanLeadStep');
var cleanDojoLead = require('../../utils/dojo/lead/cleanDojoLead');
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
  var locality = args.locality;
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
      seneca.act({role: 'cd-dojos', entity: 'lead', cmd: 'save', lead: {id: lead.id, completedAt: new Date(), completed: true}, user: args.user}, wCb);
    },
    // Partial save require reloading the lead
    function (savedLead, wCb) {
      seneca.act({role: 'cd-dojos', entity: 'lead', cmd: 'load', id: lead.id}, wCb);
    },
    // Create the dojo-admin relationship
    function (_newLead, wCb) {
      newLead = _newLead;
      var dojo = lead.application.dojo;
      dojo = cleanDojoLead(cleanLeadStep(dojo));
      seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'submit', dojo: dojo, user: user}, function (err, dojo) {
        if (err) return done(err);
        newLead.application.dojo = dojo;
        return wCb(null, dojo);
      });
    },
    // Send a notification to the user that his dojo request is awaiting approval
    function (dojo, wCb) {
      var from = seneca.options().shared.botEmail;
      var content = {
        name: user.name,
        eventsUrl: protocol + '://' + zenHostname + '/dashboard/my-dojos/' + dojo.id + '/events',
        usersUrl: protocol + '://' + zenHostname + '/dashboard/my-dojos/' + dojo.id + '/users'
      };
      var payload = {to: newLead.application.champion.email, code: 'dojo-submitted-',
       locality: locality,
       content: content, from: from, replyTo: from, subject: 'A new Dojo has been created'};
      seneca.act({role: 'cd-dojos', ctrl: 'notifications', channel: 'email', cmd: 'send', payload: payload}, wCb);
    }
  ], function () {
    done(null, newLead);
  });
};
