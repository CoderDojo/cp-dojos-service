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
  var csvFields = ['Name', 'Age', 'Email', 'Type', 'Parent Emails', 'Parent Names', 'Attendances'];

  function convertToCSV (csvData, done) {
    json2csv({data: csvData, fields: csvFields}, done);
  }
  // Returns the parent email of a child
  function getParentEmail (csvData, done) {
    var nbParents = [];
    var parentsIds = _.compact(_.map(csvData, 'Parents'));
    // Note: in case of optimisation, most parents profile are probably already loaded in getUserData
    // This query ensure that parents that don't belongs to the dojo are still reachable
    seneca.act({ role: 'cd-profiles', cmd: 'list', query: { userId: { in$: parentsIds } } },
      (err, parents) => {
        if (err) return done(err);
        csvData.forEach((user) => {
          user['Parent Emails'] = '';
          user['Parent Names'] = '';
          if (user['Parents']) {
            const parentsEmails = [];
            const parentsNames = [];
            user['Parents'].map(userId => {
              const parentData = _.find(parents, { userId });
              parentsEmails.push(parentData.email);
              parentsNames.push(parentData.name);
            });
            user['Parent Emails'] = parentsEmails.join(', ');
            user['Parent Names'] = parentsNames.join(', ');
          }
          delete user['Parents'];
        });
        return done(null, csvData);
      }  
    );
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
    var query = {
      dojoId: args.dojoId,
      deleted: 0,
      fields: ['name', 'email', 'init_user_type', 'profile_id', 'dob', 'user_id', 'parents'],
      limit$: 'NULL'
    };
    seneca.act({role: plugin, cmd: 'load_dojo_users', query: query}, function (err, responses) {
      if (err) return callback(err);
      responses = responses.response;
      async.map(responses, function (response, cb) {
        var user = {};
        user['Name'] = response.name;
        user['Email'] = response.email || '';
        user['Type'] = JSON.parse(response.initUserType).name || '';
        user['UserId'] = response.userId;
        user['Age'] = Math.floor((new Date() - new Date(response.dob)) / (3600 * 1000 * 24 * 365));
        user['Parents'] = response.parents;
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
