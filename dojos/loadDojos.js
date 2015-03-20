'use strict'

var fs = require('fs');
var seneca = require('seneca')();
var async = require('async');

var dojos = JSON.parse(fs.readFileSync('./data/dojos.json', 'utf8'));
var plugin = "load-dojos";

seneca.use('./dojos.js');

seneca.use('mongo-store',{
  name:'zen_live',
  host:'127.0.0.1',
  port:27018,
})

seneca.ready(function() {
  seneca.add({ role: plugin, cmd: 'insert' }, function (args, done) {
    var dojoPin = seneca.pin({ role: 'cd-dojos', cmd: '*' });

    function createDojo(dojo, cb){
      dojoPin.create({dojo: dojo}, cb);
    }

    var loadDojos = function (done) {
      async.eachSeries(dojos, createDojo , done);
    };

    async.series([
      loadDojos
    ], done);

  });

  seneca.act({ role: plugin, cmd: 'insert', timeout: false }, function(){
    console.log("complete");
  });
  
});




