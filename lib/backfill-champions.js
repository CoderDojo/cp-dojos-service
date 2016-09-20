(function () {
  'use strict';

  var seneca = require('seneca');
  var fs = require('fs');
  var async = require('async');
  var csvtojson = require('csvtojson');
  var _ = require('lodash');
  var phoneFormatter = require('phoneformat.js');

  var Converter = csvtojson.Converter;

  function cmd_backfill_champions(args, done){
    var seneca = this;
    var plugin = args.role;
    var converter = new Converter({
      ignoreEmpty: true,
      flatKeys: true
    });

    function readCSV(cb){
      var file = args.file;
      var fd = fs.createReadStream(file);
      fd.pipe(converter);

      converter.on('end_parsed', function (csvUsers){
        return cb(null, csvUsers);
      });

      fd.on('end', function (){
      });

      fd.on('error', function (error){
        return done(error);
      });
    }

    function getChampionInformation(csvUsers, done){
      var getSysUserChamps = function(wfCb) {
        var query = {
          or$: [{phone: null}, {phone: ''}],
          init_user_type: {in$:['{"title":"Champion","name":"champion"}', '{"name":"champion","title":"Champion"}']}
        };
        seneca.act({role: 'cd-users', cmd: 'list', query: query}, function (err, response){
          if(err) return done(err);

          seneca.act({role: 'cd-profiles', cmd: 'list', query: {phone: null, user_id : {in$: _.map(response, 'id')} }}, function (err, profileResp){
            if (err) return done(err);
            wfCb(null, profileResp);
          });
        });
      };

      var getProfileChamps = function(sysUsers, wfCb) {
        var query = {
          or$: [{phone: null}, {phone: ''}],
          user_type: 'champion',
          user_id: {nin$ : _.map(sysUsers, 'user_id')}
        };
        seneca.act({role: 'cd-profiles', cmd: 'list', query: query}, function (err, response){
          if(err) return done(err);
          wfCb(null, sysUsers, response);
        });
      };

      async.waterfall([
        getSysUserChamps,
        getProfileChamps
      ],
        function (err, sysUsers, profileUsers){
          return done(null, csvUsers, _.concat(sysUsers, profileUsers));
      });

    }

    function updateUserPhoneNumber(csvUsers, champions, done){
      var errors = [];
      var valids = 0;
      var noCountry = 0;
      async.eachSeries(csvUsers, function(user, cb){
        var correspondingZenUser = _.find(champions, {'email': user.Email});
        var tempPhone = user['Phone Number'];
        if (user['Phone Prefix']) tempPhone = '+' + user['Phone Prefix'] + tempPhone;
        var formatted = void 0;
        if (correspondingZenUser){

          var country = (correspondingZenUser.country && correspondingZenUser.country.alpha2) || user.Country;
          var cleaned = phoneFormatter.cleanPhone(tempPhone+"");
          if (country) {
            var isValid = phoneFormatter.isValidNumber(cleaned, country);
            if (!isValid) {
              formatted = phoneFormatter.formatInternational(country, correspondingZenUser.phone+"");
              isValid = phoneFormatter.isValidNumber(formatted, country);
              valids += isValid ? 1 : 0;
            }else {
              valids ++;
            }
          } else {
            noCountry ++;
          }
          correspondingZenUser.phone = ( _.isUndefined(formatted) ?  cleaned : formatted );
          seneca.act({role: 'cd-profiles', cmd: 'save', profile: correspondingZenUser}, function(err, user){
            if (err) return cb(err);
            return cb(null, user);
          });
        } else {
          errors.push('No matching user for '+ user.email);
          return cb();
        }
      }, function(err, users){
        console.log('Users synced', users);
        console.log('Users w/o match', errors.length);
        console.log('Valid', valids);
        console.log('NoCountry', noCountry);
        return done(err, users);
      });
    }

    async.waterfall([
      readCSV,
      getChampionInformation,
      updateUserPhoneNumber
    ], function (err, csv){
      if (err) return done(err);
      return done();
    });
  }

  module.exports = cmd_backfill_champions;
})();
