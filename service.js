'use strict';
process.setMaxListeners(0);
require('events').EventEmitter.prototype._maxListeners = 100;

if (process.env.NEW_RELIC_ENABLED === 'true') require('newrelic');

var config = require('./config/config.js')();
var seneca = require('seneca')(config);
var util = require('util');
var store = require('seneca-postgresql-store');
var heapdump = require('heapdump');
var log = require('cp-logs-lib')({name: 'cp-dojos-service', level: 'warn'});
config.log = log.log;
// logger creates a circular JSON
seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca.use(store, config['postgresql-store']);
if (process.env.MAILTRAP_ENABLED === 'true') {
  seneca.use('mail', config.mailtrap);
} else {
  seneca.use('mail', config.email);
}
seneca.use(require('./email-notifications.js'));
seneca.use(require('seneca-kue'));
seneca.use(require('./dojos.js'),
  {limits: config.limits,
    shared: config.shared,
   'google-api': config['google-api'],
   postgresql: config['postgresql-store'],
   kue: config.kue,
   logger: log.logger
 });
seneca.use(require('seneca-queue'));
seneca.use(require('cp-permissions-plugin'), {
  config: __dirname + '/config/permissions-rules'});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', shutdown);

function shutdown (err) {
  seneca.act({ role: 'queue', cmd: 'stop' });
  if (err !== void 0 && err.stack !== void 0) {
    console.error(new Date().toString() + ' FATAL: UncaughtException, please report: ' + util.inspect(err));
    console.error(util.inspect(err.stack));
    console.trace();
  }
  process.exit(0);
}

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
    .client({type: 'web', port: 10303, pin: 'role:cd-user-profile,cmd:*'})
    .client({type: 'web', port: 10304, pin: {role: 'cd-salesforce', cmd: '*'}})
    .client({type: 'web', port: 10306, pin: 'role:cd-events,cmd:*'});
});

seneca.act({ role: 'queue', cmd: 'start' });
