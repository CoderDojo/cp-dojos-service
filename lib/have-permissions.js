var async = require('async');
var _ = require('lodash');


function havePermissions (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.userId;
  var dojoId = args.dojoId;
  var perm = args.permissions;

  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  seneca.make$(USER_DOJO_ENTITY_NS).load$({dojoId: dojoId, userId: userId },  function (err, response) {
    if (err) return done(null, false);
    var isAllowed = false;
    console.log('perm', _.map(response.userPermissions, 'name'));
    if(_.includes(_.map(response.userPermissions, 'name'), perm )){
      isAllowed = true;
    }

    done(null, isAllowed);
  });
}

module.exports = havePermissions;
