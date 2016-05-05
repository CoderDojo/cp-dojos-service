var async = require('async');
var _ = require('lodash');

/**
 * pollCount - return the sum of all votes for a poll
 *
 * @param  {Object} args requires pollId
 * @return {Object}      count as the sum of the values of the poll
 */
function pollCount (args, done) {
  var seneca = this;
  var plugin = args.role;
  var ENTITY_NS = ('cd/polls_results');
  var pollId = args.pollId;
  seneca.make$(ENTITY_NS).list$(["SELECT sum(value), count(*) FROM cd_polls_results WHERE poll_id = $1", pollId], function(err, count){
    if(err) return done(err);
    var result = 0;
    if(count.length > 0){
      result = count[0].sum;
    }
    done(null, {count: result});
  });
}

module.exports = pollCount;
