var async = require('async');
var _ = require('lodash');

//  TODO: this follows a pattern of relation/field/expectedValue,
//  perm-engine to rewrite to avoid this fn()
function ownDojo (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var dojoId = args.params.dojoId;

  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  seneca.make$(USER_DOJO_ENTITY_NS).load$({dojoId: dojoId, userId: userId },  function (err, response) {
    if (err) return done(null, {'allowed': false});
    var isDojoOwner = response.owner === 1;
    done(null, {'allowed': isDojoOwner});
  });
}

module.exports = ownDojo;
