var async = require('async');
var cleanLeadStep = require('../../utils/dojo/lead/cleanLeadStep');
var cleanDojoLead = require('../../utils/dojo/lead/cleanDojoLead');
/**
 * Confirm a submitted lead
 * Normally accessible only to CDF, may be opened to RB
 * @param  {Object}   lead Lead to confirm
 * @return {Object}        Lead confirmed
 */
module.exports = function (args, done) {
  var seneca = this;
  var lead = args.lead;
  // TODO : remove the whole lead to only keep the id
  // /confirm/:id
  var user = args.user;
  lead.completed = true;
  // Ensure that the lead modifications are applied to the dojo by playing those series in series
  async.series([
    saveLead,
    saveDojo
  ], function (err, res) {
    if (err) return done(err);
    done(null, lead);
  });
  function saveLead (sCb) {
    seneca.act({role: 'cd-dojos', ctrl: 'lead', cmd: 'save', lead: lead, user: user},
    function (err, savedLead) {
      if (err) return done(err);
      lead = savedLead;
      sCb();
    });
  }
  function saveDojo (sCb) {
    var dojo = lead.application.dojo;
    dojo = cleanDojoLead(cleanLeadStep(dojo));
    seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'confirm', dojo: dojo, user: user}, sCb);
  }
  // TODO: email post confirmation ?
};
