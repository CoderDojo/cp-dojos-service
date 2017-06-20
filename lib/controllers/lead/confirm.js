var async = require('async');
module.exports = function (args, done) {
  var seneca = this;
  var dojoLead = args.lead;
  dojoLead.completed = true;
  async.series([
    saveLead,
    saveDojo
  ], done);
  function saveLead (sCb) {
    seneca.act({role: 'cd-dojos', ctrl: 'lead', cmd: 'save', lead: args.lead, user: args.user}, sCb);
  }
  function saveDojo (sCb) {
    seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'confirm', lead: args.lead, user: args.user}, sCb);
  }
};
