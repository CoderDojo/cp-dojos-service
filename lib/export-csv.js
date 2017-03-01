'use strict';

var _ = require('lodash');
var json2csv = require('json2csv');
var async = require('async');

// Requires dojoId for dojo user wants to export
// Returns a csv of users there emails and user type
function cmd_export_dojo_users (args, callback) {
  var seneca = this;
  var plugin = args.role;
  var query = {
    dojoId: args.dojoId,
    deleted: 0,
    limit$: 'NULL'
  };
  var csvFields = ['Name', 'Email', 'Type', 'Parent Emails', 'Attendances'];

  function convertToCSV (csvData, done) {
    json2csv({data: csvData, fields: csvFields}, done);
  }
  // Returns the parent email of a child
  function getParentEmail (csvData, done) {
    // filter to get children
    async.eachSeries(csvData, function (row, cb) {
      if (_.includes(row.Type, 'attendee')) {
        seneca.act({role: 'cd-profiles', cmd: 'load_parents_for_user', userId: row.UserId, user: args.user}, function (err, parents) {
          if (err) return cb(null);
          var emails = _.map(parents, 'email').join(', ');
          row['Parent Emails'] = emails;
          return cb(null, row);
        });
      } else {
        row['Parent Emails'] = '';
        return cb(null, row);
      }
    }, function (err) {
      if (err) return callback(err);
      return done(null, csvData);
    });
  }

  function getUsersAttendances (csvData, done) {
    var groupedAtt = {};
    query.userId = {in$: _.map(csvData, 'UserId')};
    seneca.act({role: 'cd-events', cmd: 'searchApplications', query: query}, function (err, attendances) {
      if (err) return callback(err);
      _.each(attendances, function (attendance) {
        if (!groupedAtt[attendance.userId]) groupedAtt[attendance.userId] = [];
        groupedAtt[attendance.userId] = _.filter(_.concat(groupedAtt[attendance.userId], attendance.attendance),
          function (att) { return !_.isNull(att); });
      });
      _.each(csvData, function (row) {
        if (groupedAtt[row['UserId']]) {
          row['Attendances'] = groupedAtt[row['UserId']].length;
        } else {
          row['Attendances'] = 0;
        }
      });
      done(null, csvData);
    });
  }

  function getUserData (done) {
    seneca.act({role: plugin, cmd: 'load_dojo_users', query: query}, function (err, responses) {
      if (err) return callback(err);
      responses = responses.response;
      async.map(responses, function (response, cb) {
        var user = {};
        user['Name'] = response.name;
        user['Email'] = response.email || '';
        user['Type'] = response.initUserType;
        user['UserId'] = response.userId;
        return cb(null, user);
      }, function (err, csvData) {
        if (err) return callback(null, {error: err});
        return done(null, csvData);
      });
    });
  }

  async.waterfall([ getUserData, getParentEmail, getUsersAttendances, convertToCSV ], function (err, csv) {
    if (err) return callback(null, { error: err });
    return callback(null, { data: csv });
  });
}

module.exports = cmd_export_dojo_users;
