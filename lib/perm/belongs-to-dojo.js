var async = require('async');
var _ = require('lodash');

//  TODO: this follows a pattern of relation/field/expectedValue,
//  perm-engine to rewrite to avoid this fn()
function belongsToDojo (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var dojoId = args.params.dojoId;
  var targetUserId = args.params.userId || args.params.query.userId;
  var dojos = [];
  var belongsTo = false;
  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: userId},  function (err, userDojos) {
    if (err) return done(null, {'allowed': false});
    _.each(userDojos, function(relation){
      if(_.includes(relation.userTypes, 'champion' )){
        dojos.push(relation.dojoId);
      }
    });
    seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: targetUserId, dojoId:{ in$: dojos}},  function (err, response) {
      belongsTo = response.length > 0 ;
      done(null, {'allowed': belongsTo});
    });
  });
}

module.exports = belongsToDojo;
