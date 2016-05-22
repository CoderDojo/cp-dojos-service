(function () {
  'use strict';

  var _ = require('lodash');
  var seneca = require('seneca')();
  var fs = require('fs');
  var async = require('async');
  var csvtojson = require('csvtojson');

  var Converter = csvtojson.Converter;
  var converter = new Converter({
    ignoreEmpty: true,
    flatKeys: true
  });

  var globalList = {};
  var globalMatches = {};
  var users = {};

  function cmd_backfill_champions(args, done){
    var seneca = this;
    var plugin = args.role;

    function readCSV(done){
      var file = fs.createReadStream('./data/oldResponses.csv'); //move file closer
      file.pipe(converter);

      converter.on('end_parsed', function (jsonArray){
        console.log(jsonArray);
        return done(null, jsonArray);
      });
    }

    function getChampionInformation(user, done){
      var query = {
        phone: '' || null,
        init_user_type: '{"title":"Champion","name":"champion"}',
        email: !null
      };
      seneca.act({role: plugin, cmd: 'load', query:query}, function (err, user){
        if(err) return done(err);
        _.pick(user, ['id', 'email', 'phone']);
        done(user);
      });
    }

    function doComparison(user,done){
      async.each(users, function(user,done){
        if((globalList.user.email === file.email) && globalList.user.email === null){
          globalMatches.user = globalList.user;
        }
      }, done);
    }

    function updateUserPhoneNumber(globalMatches, done){
      async.each(globalMatches, function(globalMatch,done){
        if(err) return done(err);
        globalMatch.user.phone = file.phoneNumber;
        seneca.act({role: plugin, cmd: 'update', user: globalMatch.user}, done);
      });
     }

    async.waterfall([
      readCSV, //Read data from CSV
      getChampionInformation, //Read data from DB
      doComparison, //Compare CSV and DB
      updateUserPhoneNumber //Update missing numbers
    ], function (err, data){
      if(err) return callback(null, {error:err});
      return callback(null, {file: file});
    });
  }

  module.exports = cmd_backfill_champions;
})();
