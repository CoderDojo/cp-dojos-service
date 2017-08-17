/**
 * Expose dojoleads join search to the front-end
 * TODO: Doesn't contain any logic so far, so missing test
 * @param  {Object}   query Seneca-entity select object
 * @return {[Leads]}        List of leads
 */
module.exports = function cmd_search_dojo_leads (args, done) {
  var seneca = this;
  var plugin = args.role;
  var query = args.query;
  if (query.dojoName) query.dojoName = new RegExp(query.dojoName, 'i');
  if (query.dojoEmail) query.dojoEmail = new RegExp(query.dojoEmail, 'i');
  if (query.email) query.email = new RegExp(query.email, 'i');
  seneca.act({role: plugin, entity: 'dojolead', cmd: 'list', query: query}, done);
};
