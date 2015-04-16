var _ = require('lodash');
var async = require('async');
var fs = require('fs');
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

seneca.use('postgresql-store');

var download_base = 'http://download.geonames.org/export/dump/';
//var download_base = path.join(__dirname, '../data/geonames_dump/');

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
      var input = /^http/.test(download_base) ?
        request.get(download_base + country_code + '.zip') :
        fs.createReadStream(path.join(download_base, country_code + '.zip'));

      input.pipe(geonames.pipeline)
        .pipe(through.obj( function( data, enc, next ){
          if (data.feature_class === 'A' || data.feature_class === 'P' ||
            (data.feature_class === 'L' && (data.feature_code === 'CONT'))) {
            results.push(data);
          }
          next();
        }));

      geonames.pipeline.on('end', function() {
        console.log('got', results.length, 'entries');
        done();
      });
    },
    function(done) {
      var geonames$ = seneca.make$(ENTITY_NS);
      geonames$.remove$({country_code: (country_code!=='no-country') ? country_code : '', all$: true}, done);
    },
    function(done) {
      async.eachLimit(results, 4, function(data, done) {
        var geonames$ = seneca.make$(ENTITY_NS);
        data.geoname_id = data._id;
        delete data._id;
        // index administrative entries by code
        if (data.feature_class === 'A' && /^ADM\d/.test(data.feature_code)) {
          var adm_key = make_adm_key(data);
          if (adm[adm_key]) {
            console.warn('duplicate admin key', adm_key);
            //console.log('have', JSON.stringify(adm[adm_key]));
            //console.log('new', JSON.stringify(data));
          }
          adm[adm_key] = data;
        }
        geonames$.save$(data, function(err, record) {
          if (err) { return done(err); }

          records.push(record);
          return done();
        });
      }, done);
    },
    function(done) {
      async.eachLimit(_.where(records, {feature_class: 'P'}), 4, function(record, done) {
        var dirty = false;
        _.each([1, 2, 3, 4], function(admidx) {
          var admkey =  make_adm_key(record, admidx);
          if (record['admin' +  admidx + '_code']) {
            var admdata = adm[admkey];
            if (admdata) {
              record['admin' + admidx + '_name'] = admdata.name;
              dirty = true;
            }
            else {
              console.warn('no match for', 'admin' + admidx + '_code =', record['admin' +  admidx + '_code']);
              //console.log(JSON.stringify(record.data$()));
            }
          }
        });
        if (dirty) {
          record.save$(done);
        }
        else {
          done();
        }
      }, done);
    }
  ], cb);
}

