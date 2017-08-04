module.exports = function (args, done) {
  var seneca = this;
  var lead = args.lead || args.dojoLead;
  var now = new Date();
  if (!lead.id) {
    lead.createdAt = now;
  } else {
    delete lead.created;
  }
  lead.updatedAt = now;
  seneca.make$('cd/dojoleads').save$(lead, done);
};
