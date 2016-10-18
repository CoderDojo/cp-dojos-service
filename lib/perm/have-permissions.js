var async = require('async');
var _ = require('lodash');

/**
 * Verify than the specified user is having the permission passed as a param
 * Considering it's using a dojoId, it already check if the user belongs to that dojo
 * It's safer than using only userType: champion
 * @param  {Object}   args Contains the user, the dojoId and the perm to test
 * @return {Boolean}        isAllowed, True/false
 */
function havePermissions (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var dojoId = args.params.dojoId;
  if(_.isUndefined(dojoId) && args.params.query) dojoId = args.params.query.dojoId;
  if(_.isUndefined(dojoId) && args.params.data) dojoId = args.params.data.dojoId;
  var perm = args.perm;
  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  if (dojoId && userId) {
    seneca.make$(USER_DOJO_ENTITY_NS).load$({dojoId: dojoId, userId: userId },  function (err, response) {
      if (err) return done(null, {'allowed': false});
      var isAllowed = false;
      if(!_.isEmpty(response)){
        if(_.includes(_.map(response.userPermissions, 'name'), perm )){
          isAllowed = true;
        }
      }
      done(null, {'allowed': isAllowed});
    });
  } else {
    done(null, {'allowed': false});
  }
}

module.exports = havePermissions;
