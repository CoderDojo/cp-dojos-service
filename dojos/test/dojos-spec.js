'use strict';

var seneca = require('seneca')(),
    config = require('config'),
    fs = require('fs'),
    expect = require('chai').expect;

var role = "cd-dojos";
var async = require("async");

var users = JSON.parse(fs.readFileSync('./test/fixtures/users.json', 'utf8'));
var dojos = JSON.parse(fs.readFileSync('./test/fixtures/dojos.json', 'utf8'));

console.log('using configuration', JSON.stringify(config, null, 4));
seneca.options(config);

seneca
  .use('mongo-store', config["mongo-store"])
  .use('../../dojos.js');


describe('Dojo Microservice test', function(){
  var usersEnt, dojosEnt;

  usersEnt = seneca.make$("sys/user");
  dojosEnt = seneca.make$("cd/dojos");

  //Empty Tables
  before(function(done){
    seneca.ready(function(){
      dojosEnt.native$(function(err, db){
        var collection = db.collection('cd_dojos');
        collection.remove({}, function(err, noRemoved){
          if(err){
            return done(err);
          } else {
            return done();
          }
        });
      });
    });
  });

  before(function(done){
    seneca.ready(function(){
      usersEnt.native$(function(err, db){
        var collection = db.collection('sys_users');
        collection.remove({}, function(err, noRemoved){
          if(err){
            return done(err);
          } else {
            return done();
          }
        });
      });
    });
  });


  var loadUsers = function(user, cb){
    usersEnt.save$(user, function(err, user){
      if(err){
        return cb(err);
      } else {
        cb();
      }
    });
  }

  before(function(done){
    seneca.ready(function(){
      async.eachSeries(users, loadUsers, function(err){if(err){return done(err)} done();});
    });
  });


  describe('Save successfully', function(){
    it('respond with json', function(done){      
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'create', dojo:  dojos[0], user: users[0].id}, 
          function(err, savedDojo){
            if(err){
              return done(err);
            } else {
              seneca.act({role: role, cmd: 'search', query: {_id: savedDojo.id}}, function(err, users){
                if(err){
                  return done(err);
                }
                expect(users.length).to.be.equal(1);
                expect(users[0]).to.be.ok;
                
                done();
              });
            }
        });
      });
    });
  });

});