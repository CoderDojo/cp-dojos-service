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
  .use('postgresql-store', config["postgresql-store"])
  .use('../../dojos.js');


describe('Dojo Microservice test', function(){
  var usersEnt, dojosEnt, usersDojosEnt;

  usersEnt = seneca.make$("sys/user");
  dojosEnt = seneca.make$("cd/dojos");
  usersDojosEnt = seneca.make$("cd/usersdojos");

  //Empty Tables
  before(function(done){
    seneca.ready(function(){
      dojosEnt.remove$({all$: 1}, function(err){
        if(err){
          return done(err);
        }
        done();
      });
    });
  });

  before(function(done){
    seneca.ready(function(){
      usersEnt.remove$({all$: 1}, function(err){
        if(err){
          return done(err);
        }

        done();
      });
    });
  });

  before(function(done){
    seneca.ready(function(){
      usersDojosEnt.remove$({all$: 1}, function(err){
        if(err){
          return done(err);
        }

        return done();
      })
    })
  })


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


  describe('Save', function(){
    it('respond with json', function(done){      
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'create', dojo:  dojos[0], user: users[0].id}, 
          function(err, savedDojo){
            if(err){
              return done(err);
            } else {
              seneca.act({role: role, cmd: 'search', query: {id: savedDojo.id}}, function(err, dojos){
                if(err){
                  return done(err);
                }
                expect(dojos.length).to.be.equal(1);
                expect(dojos[0]).to.be.ok;
                
                done();
              });
            }
        });
      });
    });
  });

  describe('Listing', function(){
    it('Should respond with json', function(done){
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'list'}, function(err, dojos){
          if(err){
            return done(err);
          } else {
            expect(dojos.length).to.be.equal(1);
            expect(dojos[0]).to.be.ok;

            done();
          }
        });
      });
    });
  });

  before(function(done){
    seneca.ready(function(){
      seneca.act({role: role, cmd: 'create', dojo: dojos[1], user: users[1].id},
        function(err, dojo){
          if(err){
            return done(err);
          }
          done();
        });
    });
  });

  describe('List all my dojos', function(){
    it('Should list all my dojos', function(done){
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'my_dojos_search', user: users[1], query: {skip: 0, limit: 10}}, function(err, dojos){
          if(err){
            return done(err);
          }
          expect(dojos.length).to.be.equal(1);
          expect(dojos[0]).to.be.ok;

          done();
        })
      });
    })
  });

  describe('Count all my dojos', function(){
    it('Should count all my dojos', function(done){
      seneca.ready(function(){
        seneca.act({role: role, cmd: 'my_dojos_count', user: users[1]}, function(err, noOfDojos){
          if(err){
            return done(err);
          }
          expect(noOfDojos).to.be.equal(1);
          done();
        })
      });
    })
  });

  describe('Update', function(){
    it('Should return json', function(done){
      var dojo = dojos[0];

      dojo.notes = "updated";

      seneca.ready(function(){
        seneca.act({role: role, cmd: 'update', dojo: dojo}, function(err, updatedDojo){
          if(err){
            return done(err);
          }

          expect(updatedDojo.notes).to.be.equal("updated");
          done();
        });
      })
    })
  });


});