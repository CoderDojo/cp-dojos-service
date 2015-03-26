'use strict';

var config = require('config');

var seneca = require('seneca')();

seneca.options(config);

seneca
  .use('mongo-store')
  .use('./dojos.js')
  .listen();
