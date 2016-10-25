var async = require('async');
var USER_DOJO_ENTITY_NS = 'cd/usersdojos';

module.exports = function (args, done) {
  seneca = this;
  var dojoStats = {};

  async.waterfall([
    getMentorCount,
    getNinjaCount,
    getNinjaMentorCount,
    getVolunteerCount
  ], function (err) {
    if (err) return done(err);
    return done(null, dojoStats);
  });

  function getMentorCount (cb) {
    // The user_types should contain only 'mentor'
    var sqlQuery = 'SELECT COUNT(*) FROM cd_usersdojos ' +
      'WHERE dojo_id = $1 ' +
      'AND user_types = ARRAY[\'mentor\']::character varying[];';
    makeNativeCall(sqlQuery, 'mentorCount', cb);
  }

  function getNinjaCount (cb) {
    // The user_types should contain either 'attendee-u13' or 'attendee-o13'
    var sqlQuery = 'SELECT COUNT(*) FROM cd_usersdojos ' +
      'WHERE dojo_id = $1 ' +
      'AND user_types && ARRAY[\'attendee-o13\',\'attendee-u13\']::character varying[];';
    makeNativeCall(sqlQuery, 'ninjaCount', cb);
  }

  function getNinjaMentorCount (cb) {
    // The user_types should contain one of 'attendee-u13' or 'attendee-o13',
    // and also 'mentor'
    var sqlQuery = 'SELECT COUNT(*) FROM cd_usersdojos ' +
      'WHERE dojo_id = $1 ' +
      'AND user_types && ARRAY[\'attendee-o13\',\'attendee-u13\']::character varying[] ' +
      'AND user_types @> ARRAY[\'mentor\']::character varying[];';
    makeNativeCall(sqlQuery, 'ninjaMentorCount', cb);
  }

  function getVolunteerCount (cb) {
    // The user_types should contain 'mentor' or 'champion',
    // but not 'attendee-u13' or 'attendee-o13'
    var sqlQuery = 'SELECT COUNT(*) FROM ' +
      '(SELECT dojo_id, user_types FROM cd_usersdojos ' +
        'WHERE dojo_id = $1 ' +
        'AND user_types && ARRAY[\'mentor\', \'champion\']::character varying[] ' +
        'EXCEPT ALL ' +
        'SELECT dojo_id, user_types FROM cd_usersdojos ' +
        'WHERE dojo_id = $1 ' +
        'AND user_types && ARRAY[\'attendee-o13\', \'attendee-u13\']::character varying[]) AS COUNT';
    makeNativeCall(sqlQuery, 'volunteerCount', cb);
  }

  // Make a native call with 'sql' sql statement,
  // Put the result in the 'stat' property of the dojoStats object,
  // Call 'done'.
  function makeNativeCall (sql, stat, done) {
    seneca.make$(USER_DOJO_ENTITY_NS).native$(function (err, client, release) {
      if (err) return done(err);
      client.query(sql, [args.dojoId], function (error, result) {
        if (error) return done(error);
        release();
        dojoStats[stat] = result.rows[0]['count'];
        done();
      });
    });
  }
}