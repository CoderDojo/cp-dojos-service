var async = require('async');
var _ = require('lodash');

/**
 * pollCount - return the sum of all votes for a poll
 *
 * @param  {Object} args requires pollId
 * @return {Object}      count as the sum of the values of the poll
 */
function getPolledList (args, done) {
  var seneca = this;
  var plugin = args.role;
  var skip = args.skip;
  var limit = args.limit;
  var query = {verified: 1, deleted: 0, stage: {ne$: 4}, sort$: {id: 1}};
  
  if (args.query) {
    _.defaultsDeep(query, args.query);
  }

  seneca.act({role: plugin, cmd: 'list', query: query },
    function(err, dojos) {
      if(err) return done(err);
      if (args.dryRun) {
        return done(null, {count: dojos.length});
      }
      return done(null, dojos);
  });

}

module.exports = getPolledList;
