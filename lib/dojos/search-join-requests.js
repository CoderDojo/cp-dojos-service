/**
 * Search join requests for a dojo
 * @param  {String}   dojoId the scope to apply, the dojo
 * @param  {String} query Query usually contains name or userType
 */
var async = require('async');
var _ = require('lodash');
module.exports = function (args, done) {
  var seneca = this;
  var dojoId = args.dojoId;
  var query = args.query || {};
  if (query.name) {
    var nameQuery = query.name;
    delete query.name;
  }
  query.dojoId = dojoId;
  if (!dojoId) return done(new Error('Missing parameter DojoId'));
  seneca.act({role: 'cd-users', domain: 'join_requests', cmd: 'search', query: query},
    function (err, requests) {
      if (err) return done(err);
      async.mapSeries(requests, function (request, cb) {
        var lQuery = _.clone(query);
        lQuery.userId = request.userId;
        seneca.act({role: 'cd-profiles', cmd: 'user_profile_data', query: lQuery, user: args.user}, function (err, userData) {
          if (err) cb(err);
          if (nameQuery) {
            if (!userData.name.match(nameQuery)) request = null;
          } else {
            request.userData = userData;
          }
          cb(null, request);
        });
      }, function (err, requests) {
        if (err) return done(err);
        done(null, _.without(requests, null));
      });
    });
};
