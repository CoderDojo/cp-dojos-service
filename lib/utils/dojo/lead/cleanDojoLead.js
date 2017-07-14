// Remove extraneous fields from the lead which are not in the dojo table-
// That is to say : any info that we want when creating a dojo that we don't care about post-creation
// ie : first session of the dojo
module.exports = function (lead) {
  delete lead.firstSession;
  delete lead.requestEmail;
  return lead;
};
