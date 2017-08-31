/**
 * Delete a lead
 * NOTE : we expect you to use ctrl:'dojo', cmd:'delete' if the lead has a dojo
 * @param  {Object}   args id
 */
module.exports = function (args, done) {
  var seneca = this;
  var id = args.id;
  var user = args.user;
  var plugin = args.role;
  var payload = {
    id: id,
    deleted: 1,
    deletedBy: user.id,
    deletedAt: new Date()
  };
  seneca.act({role: plugin, entity: 'lead', cmd: 'save', lead: payload}, done);
};
