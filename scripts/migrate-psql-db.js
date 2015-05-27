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
  if (err) {
    console.log(err)
  } else {
    console.log(migrations)
  }
  postgrator.endConnection(function () {
    // connection is closed, or will close in the case of SQL Server
  });
});