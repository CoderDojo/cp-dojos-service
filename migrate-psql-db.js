var postgrator = require('postgrator');
var config = require('./config/config.js')();

module.exports = function migrate (cb) {
  postgrator.setConfig({
    migrationDirectory: './scripts/database/pg/migrations',
    driver: 'pg',
    host: config['postgresql-store'].host,
    database: config['postgresql-store'].name,
    username: config['postgresql-store'].username,
    password: config['postgresql-store'].password
  });

  postgrator.migrate('max', function (err, migrations) {
    postgrator.endConnection(function () {
      return cb(err, migrations);
    });
  });
};
