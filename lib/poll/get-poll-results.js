var async = require('async');
var _ = require('lodash');

function getPollResults (args, done) {
  var seneca = this;
  var plugin = args.role;
  var ENTITY_NS = ('cd/polls_results');
  var query = args.query;
  seneca.make$(ENTITY_NS).list$(query, done);
}

module.exports = getPollResults;
