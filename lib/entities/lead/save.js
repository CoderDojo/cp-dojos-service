module.exports = function (args, done) {
  var seneca = this;
  var lead = args.lead || args.dojoLead;
  seneca.make$('cd/dojoleads').save$(lead, done);
};
