var _ = require('lodash');
var async = require('async');

var ENTITY_NS = 'cd/dojos';

var config = require('config');
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
    seneca.close();
  });
});

function run(cb) {
  loadAllDojos(function(err, list){
    if (err) {
      cb(err);
    }

    async.eachSeries(list, function (dojo, done) {
      var data = _.omit(dojo.data$(), 'entity$');
      seneca.act({
        role: 'search',
        cmd: 'save',
        index: config["elasticsearch"].connection.index,
        type: 'cd_dojos',
        data: data
      }, done);
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


