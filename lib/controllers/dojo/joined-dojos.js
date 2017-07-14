/**
 * Returns a list of dojo for the current user
 * @param  {Object}   query Filters
 * @return {Array}        List of dojos joined
 */
var async = require('async');
var purgeInviteEmails = require('./../../utils/dojo/purgeInviteEmails');
var purgeEBFields = require('./../../utils/dojo/purgeEBFields');
var _ = require('lodash');
module.exports = function (args, done) {
  var user = args.user;
  var query = args.query;
  var plugin = args.role;
  var seneca = this;
  async.waterfall([
    function (done) {
      seneca.act({role: plugin, entity: 'userdojo', cmd: 'list',
        query: {userId: user.id, limit$: 'NULL', deleted: 0}}, done);
    },
    function (userDojos, done) {
      if (!userDojos || !userDojos.length) {
        return done(null, [], [], []);
      }
      var dojoIds = _.uniq(_.map(userDojos, 'dojoId'));
      var filters = _.omit(query, ['sort$', 'skip$', 'limit$']);
      var ordering = _.pick(query, ['sort$', 'skip$', 'limit$']);
      query = _.extend({and$: [filters, {id: {in$: dojoIds}}]}, ordering);
      seneca.act({role: plugin, entity: 'dojo', cmd: 'list', query: query}, _.partialRight(done, userDojos, dojoIds));
    },
    function (dojos, userDojos, dojoIds, done) {
      _.each(dojos, function (dojo) {
        dojo.userInvites = purgeInviteEmails(dojo.userInvites);
        dojo = purgeEBFields(dojo);
      });
      return done(null, {
        // NOTE : this is wrong : an unverified dojo will be counted
        total: dojoIds.length,
        records: dojos
      });
    }
  ], done);
};
