var async = require('async');
var _ = require('lodash');

/*  TODO:10 : export as a different microservice?
polls can be related to users, event, not only dojos */
function savePollResult (args, done) {
  var seneca = this;
  var plugin = args.role;
  var ENTITY_NS = ('cd/polls');
  var poll = args.poll;
  seneca.make$(ENTITY_NS).save$(poll, done);
}

module.exports = savePollResult;
