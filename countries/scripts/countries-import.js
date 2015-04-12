var _ = require('lodash');
var async = require('async');
var path = require('path');
var split = require('split');
var geonames = require('geonames-stream');
var request = require('request');
var through = require('through2');
var csv = require('csv');

var ENTITY_NS = 'cd/countries';

var config = require('config');

var args = require('yargs')
  .usage('import countries')
  .argv;

var seneca = require('seneca')();
seneca.log.info('using config', JSON.stringify(config, null, 4));
seneca.options(config);

seneca.use('mongo-store');

seneca.ready(function() {
  run(function(err) {
    console.log('done');
    if (err) {
      seneca.log.error(err);
    }
    seneca.close();
  });
});

function run(cb) {
  var results = [];
  async.series([
    function(done) {
      var parser = csv.parse({delimiter:'\t', comment:'#'});
      request.get('http://download.geonames.org/export/dump/countryInfo.txt')
        .pipe( parser )
        .pipe(through.obj( function( data, enc, next ){
          results.push({
            alpha2: data[0],
            alpha3: data[1],
            number: data[2],
            fips: data[3],
            name: data[4],
            country_name: data[4],
            continent: data[8],
            geoid: data[16]
          });
          next();
        }));
      parser.on('end', function() {
        console.log('got', results.length, 'entries');
        done();
      });
    },
    function(done) {
    var country$ = seneca.make$(ENTITY_NS);
      country$.remove$({all$: true}, done);
    },
    function(done) {
      async.eachSeries(results, function(data, done) {
        var country$ = seneca.make$(ENTITY_NS);
        country$.save$(data, done);
      }, done);
    }
  ], cb);
}

