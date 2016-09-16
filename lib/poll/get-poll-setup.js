var async = require('async');
var _ = require('lodash');

function getPollSetup (args, done) {
  var seneca = this;
  var plugin = args.role;
  var query = args.query || {};
  if(args.pollId){
    query.id = args.pollId;
  }
  var ENTITY_NS = ('cd/polls');
  seneca.make$(ENTITY_NS).list$(query, done);
}

module.exports = getPollSetup;
