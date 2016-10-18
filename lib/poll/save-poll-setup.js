var async = require('async');
var _ = require('lodash');

// curl -d '{"role": "cd-dojos", "cmd":"save_poll_setup", "poll": {"started_at": "2016-01-31 00:00:00+00", "end_date": "2016-12-31 00:00:00+00", "question": "Stuffs ?", "value_unity": "stuff", "max_answers":1 }}' http://localhost:10301/act
/**
 * Save a poll result
 * @param  {Object}   poll Poll result to be saved
 * @return {Object}        The saved poll, including the (new) Id
 */
function savePollResult (args, done) {
  var seneca = this;
  var plugin = args.role;
  var ENTITY_NS = ('cd/polls');
  var poll = args.poll;
  seneca.make$(ENTITY_NS).save$(poll, done);
}

module.exports = savePollResult;
