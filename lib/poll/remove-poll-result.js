var async = require('async');
var _ = require('lodash');

function removePollResult (args, done) {
  var seneca = this;
  var plugin = args.role;
  var ENTITY_NS = ('cd/polls_results');
  var resultId = args.resultId;
  seneca.make$(ENTITY_NS).remove$({id: resultId}, done);
}

module.exports = removePollResult;
