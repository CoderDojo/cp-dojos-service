'use strict';

require('newrelic');

var _ = require('lodash');
var config = require('./config/config.js')();
var ESOptions = require('./es-options.js');

var seneca = require('seneca')();

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca.use('postgresql-store', config["postgresql-store"]);
seneca.use('elasticsearch', _.defaults(config["elasticsearch"], ESOptions));
seneca.use('mail', config["mail"]);
seneca.use(require('./email-notifications.js'));
seneca.use(require('./es.js'));
seneca.use(require('./dojos.js'), {limits: config.limits, 'google-api': config['google-api']});

seneca.listen()
  .client({type: 'web', host: process.env.TARGETIP || '127.0.0.1', port: 10302, pin: 'role:cd-countries,cmd:*'})
  .client({type: 'web', host: process.env.TARGETIP || '127.0.0.1', port: 10303, pin: 'role:cd-users,cmd:*'})
  .client({type: 'web', host: process.env.TARGETIP || '127.0.0.1', port: 10303, pin: 'role:cd-agreements,cmd:*'})
  .client({type: 'web', host: process.env.TARGETIP || '127.0.0.1', port: 10303, pin: 'role:cd-profiles,cmd:*'})
  .client({type: 'web', host: process.env.TARGETIP || '127.0.0.1', port: 10304, pin: 'role:cd-salesforce,cmd:*'});
