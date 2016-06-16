var async = require('async');
var _ = require('lodash');

//  TODO: this follows a pattern of relation/field/expectedValue,
//  perm-engine to rewrite to avoid this fn()
function isOwnLead (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var dojoLeadId = args.params.dojoLead.id;

  if(!_.isUndefined(dojoLeadId)){
    var DOJO_LEADS_ENTITY_NS = 'cd/dojoleads';
    seneca.make$(DOJO_LEADS_ENTITY_NS).load$({id: dojoLeadId},  function (err, response) {
      if (err) return done(null, {'allowed': false});
      var isLeadOwner = response.userId === userId;
      done(null, {'allowed': isLeadOwner});
    });
  }else{
    //  It means it's a creation, we don't need to ensure ownership
    return done(null, {'allowed': true});
  }
}

module.exports = isOwnLead;
