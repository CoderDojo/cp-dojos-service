var async = require('async');
var _ = require('lodash');

function savePollResult (args, done) {
  var seneca = this;
  var plugin = args.role;
  var ENTITY_NS = ('cd/polls_results');
  var pollResult = args.poll;
  pollResult.createdAt = new Date();
  seneca.make$(ENTITY_NS).save$(pollResult, done);
}

module.exports = savePollResult;
