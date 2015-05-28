var postgrator = require('postgrator');

var config = require('../config/config.js')();

postgrator.setConfig({
  migrationDirectory: __dirname + '/database/pg/migrations',
  driver: 'pg',
  host: config['postgresql-store'].host,
  database: config['postgresql-store'].name,
  username: config['postgresql-store'].username,
  password: config['postgresql-store'].password
});

postgrator.migrate('max', function (err, migrations) {
  postgrator.endConnection(function () {
    if (err) {
      console.error('error:', err);
      process.exit(1);
    }
    console.log('Done');
  });
});