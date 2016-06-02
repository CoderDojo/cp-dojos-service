var async = require('async');
var _ = require('lodash');


function ownDojo (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.userId;
  var dojoId = args.dojoId;

  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  seneca.make$(USER_DOJO_ENTITY_NS).load$({dojoId: dojoId, userId: userId },  function (err, response) {
    if (err) return done(null, false);
    var isDojoOwner = response.owner === 1;
    done(null, isDojoOwner);
  });
}

module.exports = ownDojo;
