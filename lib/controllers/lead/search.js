
module.exports = function cmd_search_dojo_leads (args, done) {
  var seneca = this;
  var plugin = args.role;
  var query = args.query;
  seneca.act({role: plugin, cmd: 'list', entity: 'lead', query: query}, done);
};
