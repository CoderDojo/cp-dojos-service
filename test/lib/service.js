'use strict';

var _ = require('lodash');
var async = require('async');
var config = require('../../config/config.js')({port: 11301});
var seneca = require('seneca')(config);
var service = 'cp-dojos-test';
var dgram = require('dgram');
seneca.use(require('./insert-test-dojos'));


seneca.ready(function() {
  var message = new Buffer(service);
  var client = dgram.createSocket('udp4');
  client.send(message, 0, message.length, 11404, 'localhost', function (err, bytes) {
    client.close();
  });

  seneca.add({role: service, cmd: 'suicide'}, function (err, cb) {
    seneca.close(function (err) {
      process.exit(err ? 1: 0);
    });
    cb();
  });
});


require('../../network.js')(seneca);
// Add "its" µs as a dependency
seneca.client({
  type: 'web',
  host: process.env.CD_DOJOS || 'localhost',
  port: 10301,
  pin: {
    role: 'cd-dojos',
    cmd: '*'
  }
});
