var async = require('async');
var _ = require('lodash');
/**
 * Submit a lead and all its dependencies
 * Dependencies being : champion profile, dojo, charter
 * @param  {Object}   args lead
 */
module.exports = function (args, done) {
  var seneca = this;
  var lead = args.lead;
  var plugin = args.role;
  var dojo = lead.application.dojo;
  delete dojo.isValid;
  if (!_.every(lead.application, {isValid: true})) {
    return done('Incomplete application');
  }
  lead.submitted = true;
  seneca.act({role: 'cd-dojos', entity: 'lead', cmd: 'save', lead: lead, user: args.user}, done);
  seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'submit', dojo: args.dojo, user: args.user}, done);
};
