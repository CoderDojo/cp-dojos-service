var _ = require('lodash');

//  TODO: this follows a pattern of relation/field/expectedValue,
//  perm-engine to rewrite to avoid this fn()
function isOwnLead (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var dojoLeadId;
  if (args.params.lead) dojoLeadId = args.params.lead.id;
  if (!dojoLeadId && args.params.query) dojoLeadId = args.params.query.id;

  if (!_.isUndefined(dojoLeadId)) {
    seneca.act({role: plugin, entity: 'lead', cmd: 'load', id: dojoLeadId},
      function (err, response) {
      if (err) {
        seneca.log.error(seneca.customValidatorLogFormatter('cd-dojos', 'isOwnLead', err, {userId: userId, dojoLeadId: dojoLeadId}));
        return done(null, {'allowed': false});
      }
      var isLeadOwner = response.userId === userId;
      done(null, {'allowed': isLeadOwner});
    });
  } else {
    //  It means it's a creation, we don't need to ensure ownership
    return done(null, {'allowed': true});
  }
}

module.exports = isOwnLead;
