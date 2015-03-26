'use strict';

var config = require('config');

var seneca = require('seneca')();

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca
  .use('mongo-store')
  .use('./countries.js')
  .listen();
