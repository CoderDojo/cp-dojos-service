var async = require('async');
var _ = require('lodash');

//  TODO: this follows a pattern of relation/field/expectedValue,
//  perm-engine to rewrite to avoid this fn()
function isFounder (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var dojoId = args.params.dojoId;
  var DOJO_ENTITY_NS = 'cd/dojos';
  seneca.make$(DOJO_ENTITY_NS).load$({id: dojoId },  function (err, response) {
    if (err) return done(null, {'allowed': false});
    var isDojoFounder = response.creator === userId;
    done(null, {'allowed': isDojoFounder});
  });
}

module.exports = isFounder;
