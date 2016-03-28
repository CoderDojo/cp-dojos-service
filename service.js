'use strict';
process.setMaxListeners(0);
require('events').EventEmitter.prototype._maxListeners = 100;

if (process.env.NEW_RELIC_ENABLED === 'true') require('newrelic');

var config = require('./config/config.js')();
var seneca = require('seneca')(config);
var store = require('seneca-postgresql-store');
var heapdump = require('heapdump');

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca.use(store, config['postgresql-store']);
if (process.env.MAILTRAP_ENABLED === 'true') {
  seneca.use('mail', config.mailtrap);
} else {
  seneca.use('mail', config.gmail);
}
seneca.use(require('./email-notifications.js'));
seneca.use('queue');
seneca.use(require('./dojos.js'),
  {limits: config.limits,
   'google-api': config['google-api'],
   postgresql: config['postgresql-store'],
   logger: config.logger
 });

process.on('SIGUSR2', function () {
  var snapshot = '/tmp/cp-dojos-service-' + Date.now() + '.heapsnapshot';
  console.log('Got SIGUSR2, creating heap snapshot: ', snapshot);
  heapdump.writeSnapshot(snapshot, function (err, filename) {
    if (err) console.error('Error creating snapshot:', err);
    console.log('dump written to', filename);
  });
});

require('./migrate-psql-db.js')(function (err) {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  console.log('Migrations ok');
  seneca.listen()
    .client({type: 'web', port: 10303, pin: 'role:cd-users,cmd:*'})
    .client({type: 'web', port: 10303, pin: 'role:cd-agreements,cmd:*'})
    .client({type: 'web', port: 10303, pin: 'role:cd-profiles,cmd:*'})
    .client({type: 'web', port: 10304, pin: {role: 'cd-salesforce', cmd: '*'}})
    .client({type: 'web', port: 10306, pin: 'role:cd-events,cmd:*'});
});
