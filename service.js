'use strict';
process.setMaxListeners(0);
require('events').EventEmitter.prototype._maxListeners = 100;

if (process.env.NEW_RELIC_ENABLED === "true") require('newrelic');

var _ = require('lodash');
var config = require('./config/config.js')();
var seneca = require('seneca')(config);

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca.use('postgresql-store', config["postgresql-store"]);
if(process.env.MAILTRAP_ENABLED === 'true') {
  seneca.use('mail', config.mailtrap);
} else {
  seneca.use('mail', config.gmail);
}
seneca.use(require('./email-notifications.js'));
seneca.use(require('./dojos.js'), {limits: config.limits, 'google-api': config['google-api'], postgresql: config['postgresql-store']});

require('./migrate-psql-db.js')(function (err) {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  console.log("Migrations ok");
  seneca.listen()
    .client({type: 'tcp', port: 10303, pin: 'role:cd-users,cmd:*'})
    .client({type: 'tcp', port: 10303, pin: 'role:cd-agreements,cmd:*'})
    .client({type: 'tcp', port: 10303, pin: 'role:cd-profiles,cmd:*'})
    .client({type: 'tcp', port: 10304, pin: 'role:cd-salesforce,cmd:*'});
});