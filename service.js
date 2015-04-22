'use strict';

var _ = require('lodash');
var config = require('config');
var staticESEntities = require('./es-entities.js');

var seneca = require('seneca')();

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca.use('postgresql-store', config["postgresql-store"]);
seneca.use('elasticsearch', _.defaults(config["elasticsearch"], staticESEntities));
seneca.use(require('./dojos.js'));
seneca.use(require('./es.js'));

seneca.listen()
  .client({type: 'web', host: '127.0.0.1', port: 10302, pin: 'role:cd-countries,cmd:*'});
