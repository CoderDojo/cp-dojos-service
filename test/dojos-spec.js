'use strict';

var seneca    = require('seneca')(),
    config    = require(__dirname + '/../config/config.js')(),
    fs        = require('fs'),
    expect    = require('chai').expect,
    util      = require('util'),
    _         = require('lodash'),
    async     = require('async');

var role  = "cd-dojos";

var users     = JSON.parse(fs.readFileSync(__dirname + '/fixtures/users.json', 'utf8'));
var dojos     = JSON.parse(fs.readFileSync(__dirname + '/fixtures/dojos.json', 'utf8'));
var dojoleads = JSON.parse(fs.readFileSync(__dirname + '/fixtures/dojoleads.json', 'utf8'));

console.log('using configuration', JSON.stringify(config, null, 4));
seneca.options(config);

seneca
  .use(__dirname + '/stubs/cd-countries.js')
  .use(__dirname + '/../dojos.js');

var using_postgres = false; // can be set to true for debugging
if (using_postgres) seneca.use('postgresql-store', config["postgresql-store"]);

var usersEnt      = seneca.make$("sys/user"),
    dojosEnt      = seneca.make$("cd/dojos"),
    usersDojosEnt = seneca.make$("cd/usersdojos"),
    dojoLeadsEnt  = seneca.make$("cd/dojoleads");

// this is unusually necessary
// when interrupted, node doesn't stop without this
process.on('SIGINT', function() {
  process.exit(0);
});

// NOTE: all tests are basic
//       they just follow the happy scenario for each exposed action

function create_dojo (obj, creator, done){
  seneca.act({role: role, cmd: 'create', dojo: obj, user: creator.id},
  function(err, savedDojo){
    if(err) return done(err);

    // console.log('savedDojo: ' + util.inspect(savedDojo));
    expect(savedDojo.id).to.be.ok;

    if (!using_postgres) {
      usersDojosEnt.list$({dojo_id: savedDojo.dojo_id}, function(err, loadedDojo){
        if(err) return done(err);

        // console.log('loadedDojo: ' + util.inspect(loadedDojo));

        done(null, loadedDojo);
      });
    }
    else done(null, savedDojo);
  });
}


describe('Dojo Microservice test', function(){

  // Empty Tables
  before(function(done){
    dojosEnt.remove$({all$: true}, function(err){
      if(err) return done(err); 

      done();
    });
  });

  before(function(done){
    usersEnt.remove$({all$: true}, function(err){
      if(err) return done(err);

      done();
    });
  });

  before(function(done){
    usersDojosEnt.remove$({all$: true}, function(err){
      if(err) return done(err);

      done();
    });
  });

  before(function(done){
    dojoLeadsEnt.remove$({all$: true}, function(err){
      if(err) return done(err);

      done();
    });
  });

  var loadUsers = function(user, cb){
    usersEnt.save$(user, function(err, user){
      if(err) return cb(err);
      else cb();
    });
  }

  before(function(done){
    async.eachSeries(users, loadUsers, function(err){
      if(err) return done(err);
      done();
    });
  });

  before(function(done){
    seneca.util.recurse(4, function( index, next ){
      // looks like postgres generates this field while other stores don't
      if (!using_postgres) dojos[index].user_id = users[index].id
      create_dojo(dojos[index], users[index], next);
    }, done);
  });

  // describe('Search', function(){
  //   it('Not Implemented', function(done){
  //     done(new Error('Not implemented'));
  //   });
  // });

  describe('List', function(){
    it('list all dojos from db', function(done){
      seneca.act({role: role, cmd: 'list'}, function(err, dojos){
        if(err) return done(err);
        expect(dojos).not.to.be.empty;

        // console.log('dojos: ' + util.inspect(dojos));

        var dojosNo = 0;
        _.each(dojos, function(element){
          expect(element).to.be.ok;
          dojosNo += 1;
        })

        expect(dojosNo).to.be.equal(4);

        done();
      });
    });
  });

  describe('Load', function(){
    it('load dojo from db based on id', function(done){
      dojosEnt.list$(function(err, dojos){
        if(err) return done(err);
        expect(dojos).not.to.be.empty;
        
        // console.log('dojos: ' + util.inspect(dojos));
        // console.log('dojos[0].id: ' + util.inspect(dojos[0].id));

        expect(dojos[0].id).to.exist;
        expect(dojos[0].id).to.be.ok;
        
        seneca.act({role: role, cmd: 'load', id: dojos[0].id}, function(err, dojoFound){
          if(err) return done(err);

          // console.log('dojoFound: ' + util.inspect(dojoFound));

          expect(dojoFound).to.exist;
          expect(dojoFound).to.be.ok;

          done();
        });
      });
    });
  });

  describe('Find', function(){
    it('load dojo from db based on query', function(done){
      dojosEnt.list$(function(err, dojos){
        if(err) return done(err);
        expect(dojos).not.to.be.empty;
        
        // console.log('dojos: ' + util.inspect(dojos));
        // console.log('dojos[0].id: ' + util.inspect(dojos[0].id));

        expect(dojos[0].id).to.exist;
        expect(dojos[0].id).to.be.ok;
        
        seneca.act({role: role, cmd: 'find', query: { id: dojos[0].id }}, function(err, dojoFound){
          if(err) return done(err);

          // console.log('dojoFound: ' + util.inspect(dojoFound));

          expect(dojoFound).to.exist;
          expect(dojoFound).to.be.ok;

          done();
        });
      });
    });
  });

  describe('Create', function(){
    it('save dojo to db', function(done){

      create_dojo(dojos[4], users[4],
      function(err, savedDojo){
        if(err) return done(err);

        dojosEnt.load$({creator: users[4].id}, function(err, loadedDojo){
          if(err) return done(err);
          expect(dojos).not.to.be.empty;

          // console.log('savedDojo: ' + util.inspect(savedDojo));
          // console.log('loadedDojo: ' + util.inspect(loadedDojo));

          expect(loadedDojo).to.exist;
          expect(loadedDojo).to.be.ok;

          var expectedFields = [  'admin1Code', 'admin1Name', 'alpha2', 'alpha3', 'continent',
                                  'coordinates', 'country', 'countryName', 'countryNumber',
                                  'county', 'deleted', 'email', 'location', 'mailingList',
                                  'mysqlDojoId', 'name', 'needMentors', 'notes', 'place',
                                  'placeGeonameId', 'placeName', 'private', 'state', 'time',
                                  'twitter', 'website', 'verified', 'stage', 'creator', 'created',
                                  'urlSlug', 'id' ];
          var actualFields = Object.keys(loadedDojo);
          _.each(expectedFields, function(field){
            expect(actualFields).to.include(field);
          })
          
          done();
        });
      });
    });
  });

  describe('Delete', function(){
    it('delete dojo from db', function(done){
      var dojo = dojos[0];

      dojosEnt.list$({creator: users[4].id}, function(err, dojos){
        
        // console.log('dojos: ' + util.inspect(dojos));

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        seneca.act({role: role, cmd: 'delete', id: dojos[0].id}, function(err){
          if(err) return done(err);

          dojosEnt.list$({creator: users[4].id}, function(err, dojos){
            if(err) return done(err);

            expect(dojos).to.be.empty;

            done();
          });
        });
      });
    });
  });

  describe('Update', function(){
    it('update dojo field', function(done){
      dojosEnt.list$({creator: users[0].id}, function(err, dojos){
        if(err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        var dojo = dojos[0];
        dojo.notes = "updated";

        seneca.act({role: role, cmd: 'update', dojo: dojo}, function(err, updatedDojo){
          if(err) return done(err);

          expect(updatedDojo.notes).to.be.equal("updated");
          done();
        });
      });
    });
  });

  // describe('My dojos', function(){
  //   it('list all dojos related to user', function(done){
  //     if (using_postgres) {
  //       seneca.act({role: role, cmd: 'my_dojos', user: users[0], search:{}}, function(err, dojos){
  //         if(err) return done(err);

  //         // console.log('dojos: ' + util.inspect(dojos))

  //         expect(dojos).to.exist;
  //         expect(dojos.total).to.be.equal(1);
  //         expect(dojos.records[0]).to.be.ok;

  //         done();
  //       });
  //     } else {
  //       var err = new Error('POSTGRES SPECIFIC: dojos.js makes postgres-specific query which is not supported in other stores: query:{ids:array_of_ids} in cmd_my_dojos');
  //       done(err);
  //     }
  //   });
  // });

  // describe('Dojos count (uses countries-stub)', function(){
  //   it('list dojos count per geographical location', function(done){
  //     if (using_postgres) {
  //       seneca.act({role: role, cmd: 'dojos_count'}, function(err, dojos){
  //         if(err) return done(err);
  //         dojos = dojos.dojos;

  //         // console.log('dojos: ' + util.inspect(dojos.continents));

  //         expect(dojos.continents).to.exist;
  //         expect(dojos.continents).to.include.keys(['EU', 'NA', 'SA']);
  //         expect(dojos.continents.EU.countries).to.include.keys(['RO', 'RU']);
  //         expect(dojos.continents.NA.countries).to.include.keys(['US']);
  //         expect(dojos.continents.SA.countries).to.include.keys(['BR']);

  //         var total = 0;
  //         _.each(dojos.continents, function(element){
  //           expect(element.total).to.exist;
  //           total += element.total;
  //         });

  //         expect(total).to.be.equal(4);

  //         done();
  //       });
  //     } else {
  //       var err = new Error('POSTGRES SPECIFIC: dojos.js makes postgres-specific query which is not supported in other stores: query:{limit$:\'NULL\'} in cmd_my_dojos');
  //       done(err);
  //     }
  //   });
  // });

  describe('Dojos by country', function(){
    it('list dojos by country', function(done){
      seneca.act({role: role, cmd: 'dojos_by_country', countries:{US:'', BR:'', RO:''}}, function(err, dojos){
        if(err) return done(err);

        // console.log('dojos: ' + util.inspect(dojos));

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(3);
        expect(util.inspect(dojos).toString()).to.contain.any('America', 'Brazil', 'Romania');

        done();
      });
    });
  });

  // describe('Dojos state count', function(){
  //   it('list dojos by states in country', function(done){
  //     seneca.util.recurse(2, function( index, next ){
  //       create_dojo(dojos[4+index], users[index],
  //         function(err, dojo){
  //           if(err) return done(err);
  //           expect(dojo).to.exist;
  //           next();
  //         });
  //       }, function(err, data) {

  //       if (using_postgres) {
  //           seneca.act({role: role, cmd: 'dojos_state_count', country:'UK'}, function(err, dojos){
  //             if(err) return done(err);

  //             // console.log('dojos: ' + util.inspect(dojos));

  //             expect(dojos).to.exist;
  //             expect(dojos.UK).to.exist;
  //             expect(Object.keys(dojos.UK).length).to.equal(2);

  //             done();
  //           });
  //       } else {
  //         var err = new Error('POSTGRES SPECIFIC: dojos.js makes postgres-specific query which is not supported in other stores: query:{limit$:\'NULL\'} in cmd_my_dojos');
  //         done(err);
  //       }
  //     });
  //   });
  // });

  describe('Bulk update', function(){
    it('update many dojos', function(done){
      seneca.util.recurse(2, function( index, next ){
        create_dojo(dojos[4+index], users[index],
          function(err, dojo){
            if(err) return done(err);
            expect(dojo).to.exist;
            next();
          });
        }, function(err, data) {
    
        dojosEnt.list$({alpha2:'UK'}, function(err, dojos){
          if(err) return done(err);
          // console.log('dojos: ' + util.inspect(dojos));
          expect(dojos).not.to.be.empty;

          var value = 'updated.';
          _.each(dojos, function(element){
            element.notes = value;
          });

          seneca.act({role: role, cmd: 'bulk_update', dojos:dojos}, function(err, dojos){
            if(err) return done(err);

            dojosEnt.list$({alpha2:'UK'}, function(err, dojos){
              if(err) return done(err);
              expect(dojos).not.to.be.empty;

              _.each(dojos, function(element){
                expect(element.notes).to.equal(value);
              });

              done();
            });
          });
        });
      });
    });
  });

  describe('Bulk delete', function(){
    it('delete many dojos', function(done){
      dojosEnt.list$({alpha2:'UK'}, function(err, dojos){
        if(err) return done(err);
        // console.log('dojos: ' + util.inspect(dojos));
        expect(dojos).not.to.be.empty;

        seneca.act({role: role, cmd: 'bulk_delete', dojos:dojos}, function(err, dojos){
          if(err) return done(err);

          dojosEnt.list$({alpha2:'UK'}, function(err, dojos){
            if(err) return done(err);

            expect(dojos).to.be.empty;

            done();
          });
        });
      });
    });
  });

  // describe('Get stats', function(){
  //   it('list each dojo stats', function(done){
  //     if (using_postgres) {
  //       seneca.act({role: role, cmd: 'get_stats'}, function(err, dojos){
  //         if(err) return done(err);

  //         // console.log('dojos: ' + util.inspect(dojos));

  //         expect(dojos).not.to.be.empty;
  //         expect(dojos.EU).to.exist;
  //         expect(dojos.EU.length).to.equal(2);
  //         expect(dojos.EU.toString()).to.contain.all('Romania', 'Russia');
  //         expect(dojos.NA).to.exist;
  //         expect(dojos.NA.length).to.equal(1);
  //         expect(dojos.NA.toString()).to.contain('America');
  //         expect(dojos.SA).to.exist;
  //         expect(dojos.SA.length).to.equal(1);
  //         expect(dojos.SA.toString()).to.contain('Brazil');

  //         done();
  //       });
  //     }
  //     else
  //     {
  //       var err = new Error('POSTGRES SPECIFIC: cd/stat is a postgres view - a feature unavailable in other stores');
  //       done(err);
  //     }
  //   });
  // });

  describe('Save dojo lead', function(){
    it('save dojo lead to db', function(done){
      expect(dojoleads[0]).to.exist;
      expect(dojoleads[0].user_id).to.be.ok;

      seneca.act({role: role, cmd: 'save_dojo_lead', dojoLead: dojoleads[0]}, function(err, savedLead){
        if(err) return done(err);

        // console.log('savedLead: ' + util.inspect(savedLead));

        expect(savedLead).to.exist;
        expect(savedLead.user_id).to.be.ok;
        expect(savedLead.email).to.be.ok;
        expect(savedLead).not.to.be.empty;

        dojoLeadsEnt.load$({user_id:dojoleads[0].user_id}, function(err, loadedLead){
          if(err) return done(err);

          // console.log('loadedLead: ' + util.inspect(loadedLead));

          var id_field = using_postgres ? 'userId' : 'user_id';

          expect(loadedLead).to.exist;
          expect(loadedLead[id_field]).to.be.ok;
          expect(loadedLead.email).to.be.ok;
          expect(loadedLead[id_field].toString()).to.equal(savedLead.user_id.toString());

          done();
        });
      });
    });
  });

  describe('Load user dojo lead', function(){
    it('load dojo lead based on user id', function(done){
      dojoLeadsEnt.list$(function(err, dojoLeads){

      // console.log('expectedLead: ' + util.inspect(dojoLeads[0]));

      var id_field = using_postgres ? 'userId' : 'user_id';

      expect(dojoLeads).not.to.be.empty;
      expect(dojoLeads[0][id_field]).to.be.ok;

        seneca.act({role: role, cmd: 'load_user_dojo_lead', id: dojoLeads[0].userId}, function(err, loadedLead){
          if(err) return done(err);

          // console.log('loadedLead: ' + util.inspect(loadedLead));

          expect(loadedLead).to.exist;
          expect(loadedLead[id_field]).to.be.ok;
          expect(loadedLead.email).to.be.ok;
          expect(loadedLead[id_field]).to.equal(dojoLeads[0][id_field]);

          done();
        });
      });
    });
  });

  describe('Load dojo lead', function(){
    it('load dojo lead based on its id', function(done){
      dojoLeadsEnt.list$(function(err, dojoLeads){

      // console.log('expectedLead: ' + util.inspect(dojoLeads[0]));

      expect(dojoLeads).not.to.be.empty;
      expect(dojoLeads[0].id).to.be.ok;

        seneca.act({role: role, cmd: 'load_dojo_lead', id: dojoLeads[0].id}, function(err, loadedLead){
          if(err) return done(err);

          // console.log('loadedLead: ' + util.inspect(loadedLead));

          var id_field = using_postgres ? 'userId' : 'user_id';

          expect(loadedLead).to.exist;
          expect(loadedLead[id_field]).to.be.ok;
          expect(loadedLead.email).to.be.ok;
          expect(loadedLead.id).to.equal(dojoLeads[0].id);

          done();
        });
      });
    });
  });

  describe('Load setup dojo steps', function(){
    it('load dojo wizard steps', function(done){
      seneca.act({role: role, cmd: 'load_setup_dojo_steps'}, function(err, dojoSteps){
        if(err) return done(err);

        // console.log('dojoSteps: ' + util.inspect(dojoSteps));
        expect(dojoSteps).to.not.be.empty;

        var all_keys = [];
        _.each(dojoSteps, function(element){
          var obj_keys = Object.keys(element);
          all_keys = _.union(all_keys, obj_keys); // append all fields to a list, no duplicates

          // check for all fields to be ok
          _.each(obj_keys, function(key){
            expect(element[key]).to.be.ok;
          });
        });

        // console.log('all_keys: ' + util.inspect(all_keys));

        // TODO: find a way to feed array into include assertion
        expect(all_keys).to.include('title')
        expect(all_keys).to.include('checkboxes')

        done();
      });
    });
  });

  describe('Load users dojos', function(){
    it('load usersDojo based on query', function(done){
      seneca.util.recurse(2, function( index, next ){
      create_dojo(dojos[4+index], users[index],
        function(err, dojo){
          if(err) return done(err);
          expect(dojo).to.exist;
          next();
        });
      }, function(err, data) {

        usersDojosEnt.list$(function(err, dojos){

        // console.log('allDojos: ' + util.inspect(dojos));

        expect(dojos).not.to.be.empty;
        expect(dojos[0].id).to.be.ok;

          var id_field = using_postgres ? 'userId' : 'user_id';

          // there should be two usersDojos with user_id 1001
          seneca.act({role: role, cmd: 'load_usersdojos', query: {user_id: dojos[1][id_field]}},
          function(err, loadedDojos){
            if(err) return done(err);

            // console.log('loadedDojos: ' + util.inspect(loadedDojos));

            expect(loadedDojos).to.exist;
            expect(loadedDojos.length).to.equal(2);
            expect(loadedDojos[0][id_field]).to.be.ok;
            expect(loadedDojos[1][id_field]).to.be.ok;
            expect(loadedDojos[0][id_field]).to.equal(loadedDojos[1][id_field]);

            done();
          });
        });
      });
    });
  });

});