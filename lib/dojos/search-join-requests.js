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
  var query = {};
  if (!dojoId) return done(new Error('Missing parameter DojoId'));
  query.dojoId = dojoId;
  // Optional params
  if (args.name) {
    var nameQuery = args.name;
  }
  if (args.userType) {
    query.userType = args.userType;
  }

  seneca.act({role: 'cd-users', domain: 'join_requests', cmd: 'search', query: query},
    function (err, requests) {
      if (err) return done(err);
      async.mapSeries(requests, function (request, cb) {
        var lQuery = {
          userId: request.userId
        };
        seneca.act({role: 'cd-profiles', cmd: 'user_profile_data', query: lQuery, user: args.user}, function (err, userData) {
          if (err) cb(err);
          request.userData = userData;
          if (nameQuery) {
            if (!userData.name.match(nameQuery)) request = null;
          }
          cb(null, request);
        });
      }, function (err, requests) {
        if (err) return done(err);
        done(null, _.without(requests, null));
      });
    });
};
