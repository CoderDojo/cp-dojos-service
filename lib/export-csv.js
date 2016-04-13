'use strict';

var _ = require('lodash');
var moment = require('moment');
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
  var csvFields = ['Name', 'Email', 'Type'];
  function convertToCSV (csvData, done) {
    json2csv({data: csvData, fields: csvFields}, done);
  }

  function getUserData (done) {
    var csvData = [];
    seneca.act({role:plugin, cmd: 'load_dojo_users', query: query}, function (err, responses) {
      responses = responses.response
      if (err) return callback(err);
      async.map(responses, function (response, cb) {
        var user = {};
        user['Name'] = response.name;
        user['Email'] = response.email || '';
        user['Type'] = response.initUserType;
        return cb(null, user);
      }, function (err, csvData) {
        if (err) return callback(null, {error: err});
        return done(null, csvData);
      });
    });
  }

  async.waterfall([ getUserData, convertToCSV ], function (err, csv) {
    if(err) return callback(null, { error: err });
    return callback (null, { data: csv });
  });
}

module.exports = cmd_export_dojo_users;
