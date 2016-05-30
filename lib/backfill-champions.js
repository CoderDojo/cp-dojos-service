(function () {
  'use strict';

  var seneca = require('seneca');
  var fs = require('fs');
  var async = require('async');
  var csvtojson = require('csvtojson');
  var _ = require('lodash');

  var Converter = csvtojson.Converter;
  var converter = new Converter({
    ignoreEmpty: true,
    flatKeys: true
  });

  function cmd_backfill_champions(args, done){
    var seneca = this;
    var plugin = args.role;

    function readCSV(done){
      var file = './data/oldResponses.csv';
      fs.createReadStream(file).pipe(converter);

      converter.on('end_parsed', function (csvUsers){
        return done(null, csvUsers);
      });
    }

    function getChampionInformation(csvUsers, done){
      var query = {
        phone: null,
        init_user_type: '{"title":"Champion","name":"champion"}'
      };
      seneca.act({role: 'cd-users', cmd: 'list', query:query}, function (err, response){
        if(err) return done(err);
        done(null, csvUsers, response);
      });
    }

    function updateUserPhoneNumber(users, champions, done){
      var errors = [];
      async.each(champions, function(champion, cb){
        var correspondingCSVUser = _.find(users, {email: champion.email});
        if(correspondingCSVUser && champion.email === correspondingCSVUser.email){
          champion.phone = correspondingCSVUser.phoneNumber;
          seneca.act({role: 'cd-users', cmd: 'update', user:champion}, function(err, user){
            if(err) return cb(err);
            return cb(null, user);
          });
        } else {
          errors.push('No matching user for '+ champion.email);
        }
      }, done);
    }

    async.waterfall([
      readCSV,
      getChampionInformation,
      updateUserPhoneNumber
    ], function (err, csv){
      if(err) return done(err);
      return done();
    });
  }

  module.exports = cmd_backfill_champions;
})();
