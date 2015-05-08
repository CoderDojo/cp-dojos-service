var _ = require('lodash');
var async = require('async');

var ENTITY_NS = 'cd/dojos';

var config = require('../config/config.js')();
var ESOptions = require('../es-options.js');

var args = require('yargs')
  .usage('re-save dojos to index them in ES')
  .argv;

var seneca = require('seneca')();
seneca.log.info('using config', JSON.stringify(config, null, 4));
seneca.options(config);

seneca.use('postgresql-store');
seneca.use('elasticsearch', _.defaults(config["elasticsearch"], ESOptions));

seneca.ready(function() {
  run(function(err) {
    console.log('done');
    if (err) {
      seneca.log.error(err);
    }

    //TODO: remove seneca.close callback once issues are fixed(probably with seneca-elasticsearch)
    seneca.close(function() {
      process.exit();
    });
  });
});

function run(cb) {
  loadAllDojos(function(err, list){
    if (err) {
      cb(err);
    }

    async.eachSeries(list, function (dojo, done) {
      var data = dojo.data$();
      data.entity$ = '-/' + data.entity$.base + '/' + data.entity$.name;
      if (!data.geoPoint && data.coordinates) {
        var pair = _.trim(data.coordinates, '@').split(',').map(parseFloat);
        if (pair.length === 2 && _.isFinite(pair[0]) && _.isFinite(pair[1])) {
          data.geoPoint = {
            lat: pair[0],
            lon: pair[1]
          }
        }
      }
      console.log(data.coordinates, data.geoPoint);

      async.series([
        function(done) {
          seneca.act({
            role: 'search',
            cmd: 'save',
            index: config["elasticsearch"].connection.index,
            type: 'cd_dojos',
            data: data
          }, done);
        },
        function(done) {
          dojo.geoPoint = data.geoPoint;
          dojo.save$(done);
        }
      ], done);

    }, cb);
  });
}

function loadAllDojos(cb) {
  var query = {};
  query.limit$ = 'NULL';
  var dojo$ = seneca.make$(ENTITY_NS);

  dojo$.list$(query, function(err, list) {
    cb(err, list);
  });
}
