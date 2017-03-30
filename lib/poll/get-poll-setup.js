var async = require('async');
var _ = require('lodash');

// curl -d '{"role": "cd-dojos", "cmd":"get_polled_list", "pollId":"cadbfb9b-eed3-4b80-91d4-9c4cd10e4bea"}' http://localhost:10301/act
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
