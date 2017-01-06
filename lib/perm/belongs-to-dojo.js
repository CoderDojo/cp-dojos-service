var async = require('async');
var _ = require('lodash');

//  TODO: this follows a pattern of relation/field/expectedValue,
//  perm-engine to rewrite to avoid this fn()
//  Belongs to a dojo that I have admin rights on
function belongsToDojo (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var dojoId = args.params.dojoId;
  var targetUserId = args.params.userId || args.params.query.userId;
  var dojos = [];
  var belongsTo = false;
  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: userId}, function (err, userDojos) {
    if (err) {
      seneca.log.error(seneca.customValidatorLogFormatter('cd-dojos', 'isParentOf::1', err, {userId: userId, dojoId: dojoId, targetUserId: targetUserId}));
      return done(null, {'allowed': false});
    }
    _.each(userDojos, function(relation){
      if (_.includes(relation.userTypes, 'champion' ) || _.find(relation.userPermissions, {name: 'dojo-admin'})) {
        dojos.push(relation.dojoId);
      }
    });
    if (dojos.length > 0) {
      seneca.make$(USER_DOJO_ENTITY_NS).list$({userId: targetUserId, dojoId:{ in$: dojos}}, function (err, response) {
        if (err) {
          seneca.log.error(seneca.customValidatorLogFormatter('cd-dojos', 'isParentOf::2', err, {userId: userId, dojoId: dojoId, targetUserId: targetUserId, userDojos: userDojos}));
          return done(null, {'allowed': false});
        }
        belongsTo = response.length > 0 ;
        done(null, {'allowed': belongsTo});
      });
    } else {
      done(null, {'allowed': false});
    }
  });
}

module.exports = belongsToDojo;
