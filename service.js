'use strict';
process.setMaxListeners(0);
require('events').EventEmitter.prototype._maxListeners = 100;

if (process.env.NEW_RELIC_ENABLED === 'true') require('newrelic');

var config = require('./config/config.js')();
var seneca = require('seneca')(config);
var util = require('util');
var _ = require('lodash');
var store = require('seneca-postgresql-store');
var storeQuery = require('seneca-store-query');
var dgram = require('dgram');
var service = 'cp-dojos-service';
var log = require('cp-logs-lib')({name: service, level: 'warn'});
var sanitizeHtml = require('sanitize-html');
config.log = log.log;
// logger creates a circular JSON
if (process.env.NODE_ENV !== 'production') {
  seneca.log.info('using config', JSON.stringify(config, null, 4));
}

seneca.options(config);
seneca.options.sanitizeTextArea = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  allowedAttributes: _.assign({}, sanitizeHtml.defaults.allowedAttributes, {
    /**
     * Allowing everything here since within ckeditor you have the option of setting the following:
     *
     *   * styles such as border, width, and height.
     *   * alt text
     *
     * However ng-bind-html strips the style tag, so you won't actually see custom styling.
     */
    img: ['*']
  })
};
seneca.decorate('customValidatorLogFormatter', require('./lib/custom-validator-log-formatter'));
seneca.use(store, config['postgresql-store']);
seneca.use(storeQuery);
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
process.on('SIGUSR2', shutdown);

function shutdown (err) {
  seneca.act({ role: 'queue', cmd: 'stop' });
  if (err !== undefined) {
    var error = {
      date: new Date().toString(),
      msg: err.stack !== undefined
        ? 'FATAL: UncaughtException, please report: ' + util.inspect(err.stack)
        : 'FATAL: UncaughtException, no stack trace',
      err: util.inspect(err)
    };
    console.error(JSON.stringify(error));
    process.exit(1);
  }
  process.exit(0);
}

require('./migrate-psql-db.js')(function (err) {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  console.log('Migrations ok');
  require('./network')(seneca);
});
seneca.ready(function () {
  seneca.act({ role: 'queue', cmd: 'start' });
  var message = new Buffer(service);

  var client = dgram.createSocket('udp4');
  client.send(message, 0, message.length, 11404, 'localhost', function (err, bytes) {
    if (err) {
      console.error(err);
      process.exit(-1);
    }
    client.close();
  });
  var escape = require('seneca-standard-query/lib/relational-util').escapeStr;
  ['load', 'list'].forEach(function (cmd) {
    seneca.wrap('role: entity, cmd: ' + cmd, function filterFields (args, cb) {
      try {
        ['limit$', 'skip$'].forEach(function (field) {
          if (args.q[field] && args.q[field] !== 'NULL' && !/^[0-9]+$/g.test(args.q[field] + '')) {
            throw new Error('Expect limit$, skip$ to be a number');
          }
        });
        if (args.q.sort$) {
          if (args.q.sort$ && typeof args.q.sort$ === 'object') {
            var order = args.q.sort$;
            _.each(order, function (ascdesc, column) {
              if (!/^[a-zA-Z0-9_]+$/g.test(column)) {
                throw new Error('Unexpect characters in sort$');
              }
            });
          } else {
            throw new Error('Expect sort$ to be an object');
          }
        }
        if (args.q.fields$) {
          args.q.fields$.forEach(function (field, index) {
            args.q.fields$[index] = '\"' + escape(field) + '\"';
          });
        }
        this.prior(args, cb);
      } catch (err) {
        // cb to avoid seneca-transport to hang while waiting for timeout error
        return cb(err);
      }
    });
  });
});
