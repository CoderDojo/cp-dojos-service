var _ = require('lodash');
var async = require('async');
var path = require('path');
var geonames = require('geonames-stream');
var request = require('request');
var through = require('through2');

var ENTITY_NS = 'cd/geonames';

var config = require('config');

var args = require('yargs')
  .usage('import geonames data')
  .string('country')
  .require('country')
  .describe('country', 'country code e.g. gb')
  .argv;

var seneca = require('seneca')();
seneca.log.info('using config', JSON.stringify(config, null, 4));
seneca.options(config);

seneca.use('mongo-store');

seneca.ready(function() {
  import_country(args.country, function(err) {
    console.log('done');
    if (err) {
      seneca.log.error(err);
    }

    seneca.close();
  });
});

function import_country(country_code, cb) {
  var results = [];
  var records = [];
  var adm = {};

  function make_adm_key(record, depth) {
    depth = depth || 4;
    //console.log('generating adm key', 'depth', depth, JSON.stringify(_.pick(record, 'feature_code', 'admin1_code', 'admin2_code', 'admin3_code', 'admin4_code')));
    var result = _.reduce(['1', '2', '3', '4'].slice(0, depth), function(key, idx) {
      if (record['admin' + idx + '_code']) {
        return (key ? (key + '_') : '') + record['admin' + idx + '_code'];
      }
      else {
        return key;
      }
    }, '');
    //console.log(result);
    return result;
  }

  async.series([
    function(done) {
      request.get('http://download.geonames.org/export/dump/' + country_code + '.zip')
        .pipe(geonames.pipeline)
        .pipe(through.obj( function( data, enc, next ){
          results.push(data);
          next();
        }));
      geonames.pipeline.on('end', function() {
        console.log('got', results.length, 'entries');
        done();
      });
    },
    function(done) {
    var geonames$ = seneca.make$(ENTITY_NS);
      geonames$.remove$({country_code:country_code, all$: true}, done);
    },
    function(done) {
      async.eachSeries(results, function(data, done) {
        var geonames$ = seneca.make$(ENTITY_NS);
        data.geoid = data._id;
        delete data._id;
        // index administrative entries by code
        if (data.feature_class === 'A' && /^ADM/.test(data.feature_code)) {
          if (adm[make_adm_key(data)]) {
            console.warn('duplicate admin key', make_adm_key(data));
          }
          adm[make_adm_key(data)] = data;
        }
        geonames$.save$(data, function(err, record) {
          if (err) { return done(err); }

          records.push(record);
          return done();
        });
      }, done);
    },
    function(done) {
      async.eachSeries(_.where(records, {feature_class: 'P'}), function(record, done) {
        async.eachSeries([1, 2, 3, 4], function(admidx, done) {
          var admkey =  make_adm_key(record, admidx);
          if (record['admin' +  admidx + '_code']) {
            var admdata = adm[admkey];
            if (admdata) {
              record['admin' + admidx + '_name'] = admdata.name;
              record.save$(done);
            }
            else {
              console.warn('no match for', 'level' + admidx, record['admin' +  admidx + '_code']);
              return done();
            }
          }
          else {
            return done();
          }
        }, done);
      }, done);
    }
  ], cb);
}

