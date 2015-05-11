'use strict';

var seneca = require('seneca')(),
    config = require(__dirname + '/../config/config.js')(),
    // ESOptions = require(__dirname + '/../es-options.js'),
    fs = require('fs'),
    expect = require('chai').expect,
    util = require('util'),
    _ = require('lodash');

var role = "cd-dojos";
var async = require("async");

var users = JSON.parse(fs.readFileSync('./test/fixtures/users.json', 'utf8'));
var dojos = JSON.parse(fs.readFileSync('./test/fixtures/dojos.json', 'utf8'));

console.log('using configuration', JSON.stringify(config, null, 4));
seneca.options(config);

seneca
  .use('postgresql-store', config["postgresql-store"])
  // .use('elasticsearch', _.defaults(config["elasticsearch"], ESOptions))
  .use(__dirname + '/../dojos.js')
  // .use(__dirname + '/../es.js');

// seneca
//   .client({type: 'web', host: '127.0.0.1', port: 10302, pin: 'role:cd-countries,cmd:*'})
//   .client({type: 'web', host: '127.0.0.1', port: 10303, pin: 'role:cd-users,cmd:*'})
//   .client({type: 'web', host: '127.0.0.1', port: 10303, pin: 'role:cd-agreements,cmd:*'});

// TODO: remove. used to peek at data
// seneca.make$('cd/dojos').load$({mysql_dojo_id:1330}, function(err, dojo1){
//   seneca.make$('cd/dojos').load$({mysql_dojo_id:1331}, function(err, dojo2){
//     console.log('\n dojo1: ' + util.inspect(dojo1.toString().split(';')) + '\n');
//     console.log('\n dojo2: ' + util.inspect(dojo2.toString().split(';')) + '\n');
//   });  
// });

describe('Dojo Microservice test', function(){
  var usersEnt, dojosEnt, usersDojosEnt;

  usersEnt = seneca.make$("sys/user");
  dojosEnt = seneca.make$("cd/dojos");
  usersDojosEnt = seneca.make$("cd/usersdojos");

  // Empty Tables
  before(function(done){
    seneca.ready(function(){
      dojosEnt.remove$({all$: 1}, function(err){
        if(err) return done(err); 

        done();
      });
    });
  });

  before(function(done){
    seneca.ready(function(){
      usersEnt.remove$({all$: 1}, function(err){
        if(err) return done(err);

        done();
      });
    });
  });

  before(function(done){
    seneca.ready(function(){
      usersDojosEnt.remove$({all$: 1}, function(err){
        if(err) return done(err);

        done();
      });
    });
  });

  var loadUsers = function(user, cb){
    usersEnt.save$(user, function(err, user){
      if(err) return cb(err);
      else cb();
    });
  }

  before(function(done){
    seneca.ready(function(){
      async.eachSeries(users, loadUsers, function(err){if(err){return done(err)} done();});
    });
  });

  before(function(done){
    seneca.ready(function(){
      seneca.act({role: role, cmd: 'create', dojo: dojos[1], user: users[1].id},
      function(err, dojo){
        if(err) return done(err);

        done();
      });
    });
  });

  describe('Save', function(){
    it('respond with json', function(done){      
      seneca.ready(function(){

        seneca.act({role: role, cmd: 'create', dojo:  dojos[0], user: users[0].id}, 
        function(err, savedDojo){
          if(err) return done(err);

          dojosEnt.list$({creator: users[0].id}, function(err, listedDojos){
            if(err) return done(err);

            // console.log('saved: ' + util.inspect(savedDojo));
            // console.log('listed: ' + util.inspect(listedDojos));

            expect(listedDojos).to.exist;
            expect(listedDojos.length).to.be.equal(1);
            expect(listedDojos[0]).to.be.ok;
            
            done();
          });
        });
      });
    });
  });

  describe('Listing', function(){
    it('Should respond with json', function(done){
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'list'}, function(err, dojos){
          if(err) return done(err);

          expect(dojos).to.exist;
          // console.log('dojos: ' + util.inspect(dojos));

          var dojosNo = 0;
          _.each(dojos, function(element){
            expect(element).to.be.ok;
            dojosNo += 1;
          })

          expect(dojosNo).to.be.equal(2);

          done();
        });
      });
    });
  });

  describe('Load', function(){
    it('Should respond with json', function(done){
      seneca.ready(function(){
        dojosEnt.list$(function(err, dojos){
          
          // console.log('dojos: ' + util.inspect(dojos));

          expect(dojos[0].id).to.exist;
          expect(dojos[0].id).to.be.ok;
          
          seneca.act({role: role, cmd: 'load', id:dojos[0].id}, function(err, dojoFound){
            if(err) return done(err);

            // console.log('dojoFound: ' + util.inspect(dojoFound));

            expect(dojoFound).to.exist;
            expect(dojoFound).to.be.ok;

            done();
          });
        });
      });
    });
  });


  describe('List all my dojos', function(){
    it('Should list all my dojos', function(done){
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'my_dojos', user: users[1], search: {from:0, size:100}}, function(err, dojos){
          if(err) return done(err);

          // console.log('dojos: ' + util.inspect(dojos))

          expect(dojos).to.exist;
          expect(dojos.total).to.be.equal(1);
          expect(dojos.records[0]).to.be.ok;

          done();
        })
      });
    })
  });

  describe('Update', function(){
    it('Should return json', function(done){
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'my_dojos', user: users[0], search: {from:0, size:100}}, function(err, dojos){
          if(err) return done(err);

          expect(dojos).to.exist;
          expect(dojos.total).to.be.equal(1);
          expect(dojos.records[0]).to.be.ok;

          var dojo = dojos.records[0];
          dojo.notes = "updated";

          seneca.act({role: role, cmd: 'update', dojo: dojo}, function(err, updatedDojo){
            if(err) return done(err);

            expect(updatedDojo.notes).to.be.equal("updated");
            done();
          });
        });
      })
    })
  });

  describe('Delete', function(){
    it('Should delete dojo from database', function(done){
      var dojo = dojos[0];

      seneca.ready(function(){
        seneca.act({role: role, cmd: 'my_dojos', user: users[0], search: {from:0, size:100}}, function(err, dojos){
          
          expect(dojos).to.exist;
          expect(dojos.total).to.be.equal(1);
          expect(dojos.records[0]).to.be.ok;

          seneca.act({role: role, cmd: 'delete', id: dojos.records[0].id}, function(err){
            if(err) return done(err);

              seneca.act({role: role, cmd: 'my_dojos', user: users[0], search: {from:0, size:100}}, function(err, dojos){
              if(err) return done(err);

              expect(dojos).to.exist;
              expect(dojos.total).to.be.equal(0);
              expect(dojos.records[0]).to.be.undefined;

              done();
            });
          });
        });
      })
    })
  });

});