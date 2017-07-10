var async = require('async');
/**
 * Soft delete a dojo and its dependencies
 * @param  {Object}   dojo the Dojo to delete
 */
module.exports = function cmd_delete (args, done) {
  var seneca = this;
  var plugin = args.role;
  var user = args.user;
  var dojo = args.dojo;
  async.waterfall([
    deleteDojo,
    deleteUsersDojos,
    deleteDojoLead
  ], function (err, res) {
    if (err) return done(null, {error: err});
    return done(null, res);
  });

  function deleteDojo (wfCb) {
    if (!dojo.id) return done(new Error('Missing dojo id'));
    var saveDojo = {
      id: dojo.id,
      deleted: 1,
      deletedBy: user.id,
      deletedAt: new Date()
    };
    seneca.act({role: plugin, entity: 'dojo', cmd: 'save', dojo: saveDojo}, wfCb);
  }

  function deleteUsersDojos (dojo, wfCb) {
    seneca.act({role: plugin, entity: 'userdojo', cmd: 'list', query: {dojoId: dojo.id}}, function (err, list) {
      if (err) return done(err);
      if (list && list.length > 0) {
        async.each(list, function (ent, cb) {
          ent.deleted = 1;
          ent.deletedBy = user.id;
          ent.deletedAt = new Date();
          seneca.act({role: plugin, entity: 'userdojo', cmd: 'save', userdojo: ent}, cb);
        }, wfCb);
      } else {
        wfCb();
      }
    });
  }

  function deleteDojoLead (wfCb) {
    if (!dojo.dojoLeadId) return done(new Error('Missing dojo lead_id'));
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'delete', id: dojo.dojoLeadId, user: user}, wfCb);
  }
};
