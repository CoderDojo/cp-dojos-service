'use strict';

var config = require('config');

var seneca = require('seneca')();

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca
  .use('postgresql-store', config["postgresql-store"])
  .use('./dojos.js')
  .listen()
  .client({type: 'web', host: '127.0.0.1', port: 10302, pin: 'role:cd-countries,cmd:*'});
