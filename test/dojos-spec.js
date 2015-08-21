'use strict';

var seneca    = require('seneca')(),
    config    = require(__dirname + '/../config/config.js')(),
    fs        = require('fs'),
    expect    = require('chai').expect,
    util      = require('util'),
    _         = require('lodash'),
    async     = require('async'),
    lab       = exports.lab = require('lab').script();

var role  = "cd-dojos";

var users     = require('./fixtures/users.json');
var dojos     = require('./fixtures/dojos.json');
var dojoleads = require('./fixtures/dojoleads.json');
var usersDojos= require('./fixtures/usersdojos.json');

console.info('using configuration', JSON.stringify(config, null, 4));
seneca.options(config);

seneca
  .use(__dirname + '/stubs/cd-countries.js')
  .use(__dirname + '/stubs/cd-profiles.js')
  .use(__dirname + '/../dojos.js', {limits: {maxUserDojos: 10}});

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
  seneca.act({role: role, cmd: 'create', dojo: obj, user: {id: creator.id, roles: ['cdf-admin']}},
  function(err, savedDojo){
    if(err) return done(err);

    expect(savedDojo.id).to.be.ok;

    if (using_postgres) return done(null, savedDojo);

    usersDojosEnt.list$({dojo_id: savedDojo.dojo_id}, done);
  });
}

function create_users_dojos(obj, done) {
  seneca.act({role: role, cmd: 'save_usersdojos', userDojo: obj}, done);
}



lab.experiment('Dojo Microservice test', function(){

  // Empty Tables
  lab.before(function(done){
    dojosEnt.remove$({all$: true}, done);
  });

  lab.before(function(done){
    usersEnt.remove$({all$: true}, done);
  });

  lab.before(function(done){
    usersDojosEnt.remove$({all$: true}, done);
  });

  lab.before(function(done){
    dojoLeadsEnt.remove$({all$: true}, done);
  });

  var loadUsers = function(user, cb){
    usersEnt.save$(user, cb);
  }

  lab.before(function(done){
    async.eachSeries(users, loadUsers, done);
  });

  lab.before(function(done){
    seneca.util.recurse(4, function( index, next ){
      // looks like postgres generates this field while other stores don't
      if (!using_postgres) dojos[index].userId = users[index].id
      create_dojo(dojos[index], users[index], next);
    }, done);
  });

  lab.before(function(done){
    async.eachSeries(usersDojos, function(item, callback){

      dojosEnt.list$( function(err, dojos) {
        if (err) return done(err);
        item.dojoId = dojos[0].id;
        create_users_dojos(item, callback);
      });
    }, function(err){
      if(err) return done(err);
      done();
    });
  });

  lab.experiment('List', function(){
    lab.test.skip('list all dojos from db', function(done){
      seneca.act({role: role, cmd: 'list'}, function(err, dojos){
        if(err) return done(err);

        expect(dojos).not.to.be.empty;

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

  lab.experiment('Load', function(){
    lab.test('load dojo from db based on id', function(done){
      dojosEnt.list$(function(err, dojos){
        if(err) return done(err);
        expect(dojos).not.to.be.empty;

        expect(dojos[0].id).to.exist;
        expect(dojos[0].id).to.be.ok;

        seneca.act({role: role, cmd: 'load', id: dojos[0].id}, function(err, dojoFound){
          if(err) return done(err);

          expect(dojoFound).to.exist;
          expect(dojoFound).to.be.ok;

          done();
        });
      });
    });
  });

  lab.experiment('Find', function(){
    lab.test('load dojo from db based on query', function(done){
      dojosEnt.list$(function(err, dojos){
        if(err) return done(err);
        expect(dojos).not.to.be.empty;

        expect(dojos[0].id).to.exist;
        expect(dojos[0].id).to.be.ok;

        seneca.act({role: role, cmd: 'find', query: { id: dojos[0].id }}, function(err, dojoFound){
          if(err) return done(err);

          expect(dojoFound).to.exist;
          expect(dojoFound).to.be.ok;

          done();
        });
      });
    });
  });

  lab.experiment('Create', function(){
    lab.test('save dojo to db', function(done){

      create_dojo(dojos[4], users[4],
      function(err, savedDojo){
        if(err) return done(err);

        dojosEnt.load$({creator: users[4].id}, function(err, loadedDojo){
          if(err) return done(err);
          expect(dojos).not.to.be.empty;

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

  lab.experiment('Save dojo lead', function(){
    lab.test('save dojo lead to db', function(done){
      expect(dojoleads[0]).to.exist;
      expect(dojoleads[0].userId).to.be.ok;

      seneca.act({role: role, cmd: 'save_dojo_lead', dojoLead: dojoleads[0]}, function(err, savedLead){
        if(err) return done(err);

        expect(savedLead).to.exist;
        expect(savedLead.userId).to.be.ok;
        expect(savedLead.email).to.be.ok;
        expect(savedLead).not.to.be.empty;

        dojoLeadsEnt.load$({userId:dojoleads[0].userId}, function(err, loadedLead){
          if(err) return done(err);


          expect(loadedLead).to.exist;
          expect(loadedLead.userId).to.be.ok;
          expect(loadedLead.email).to.be.ok;
          expect(loadedLead.userId).to.equal(savedLead.userId);

          done();
        });
      });
    });
  });

  lab.experiment('Delete', function(){

    lab.test('should not delete without correct user role', function (done) {
      dojosEnt.list$({creator: users[4].id}, function(err, dojos){

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        seneca.act({role: role, cmd: 'delete', id: dojos[0].id, user: {roles: ['basic-user']}}, function(err, output){
          if(err) return done(err);
          dojosEnt.list$({creator: users[4].id}, function(err, dojos){
            if(err) return done(err);

            expect(dojos).to.be.not.empty;

            done();
          });
        });
      }); 
    });

    lab.test('delete dojo from db', { timeout: 20000 }, function(done){
      dojosEnt.list$({creator: users[0].id}, function(err, dojos){

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        seneca.act({role: role, cmd: 'delete', id: dojos[0].id, dojoLeadId: 1000, user: {roles: ['cdf-admin']}}, function(err, output){
          if(err) return done(err);
          dojosEnt.list$({id: dojos[0].id}, function(err, dojos){
            if(err) return done(err);

            expect(dojos[0].deleted).to.equal(1);

            done();
          });
        });
      });
    });
  });

  lab.experiment('Load user dojo lead', function(){
    lab.test('load dojo lead based on user id', function(done){
      dojoLeadsEnt.list$(function(err, dojoLeads){

        expect(dojoLeads).not.to.be.empty;
        expect(dojoLeads[0].userId).to.be.ok;

        seneca.act({role: role, cmd: 'load_user_dojo_lead', id: dojoLeads[0].user_id}, function(err, loadedLead){
          if(err) return done(err);

          expect(loadedLead).not.to.exist;
          done();
        });
      });
    });
  });


  lab.experiment('Update', function(){
    lab.test('update dojo field', function(done){
      dojosEnt.list$({creator: users[3].id}, function(err, dojos){
        if(err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        var dojo = dojos[0];
        dojo.verified = 0;
        dojo.notes = "updated";

        seneca.act({role: role, cmd: 'update', dojo: dojo, user:{roles:['cdf-admin']}}, function(err, updatedDojo){
          if(err) return done(err);

          expect(updatedDojo.notes).to.be.equal("updated");
          done();
        });
      });
    });
  });

  lab.experiment.skip('My dojos', function () {
    lab.test('list all dojos related to user', function (done) {
      if (using_postgres) {
        seneca.act({role: role, cmd: 'my_dojos', user: users[0], search: {}}, function (err, dojos) {
          if (err) return done(err);

          expect(dojos).to.exist;
          expect(dojos.total).to.be.equal(1);
          expect(dojos.records[0]).to.be.ok;

          done();
        });
      } else {
        var err = new Error('POSTGRES SPECIFIC: dojos.js makes postgres-specific query which is not supported in other stores: query:{ids:array_of_ids} in cmd_my_dojos');
        done(err);
      }
    });
  });

  lab.experiment.skip('Dojos count (uses countries-stub)', function () {
    lab.test('list dojos count per geographical location', function (done) {
      if (using_postgres) {
        seneca.act({role: role, cmd: 'dojos_count'}, function (err, dojos) {
          if (err) return done(err);
          dojos = dojos.dojos;

          expect(dojos.continents).to.exist;
          expect(dojos.continents).to.include.keys(['EU', 'NA', 'SA']);
          expect(dojos.continents.EU.countries).to.include.keys(['RO', 'RU']);
          expect(dojos.continents.NA.countries).to.include.keys(['US']);
          expect(dojos.continents.SA.countries).to.include.keys(['BR']);

          var total = 0;
          _.each(dojos.continents, function (element) {
            expect(element.total).to.exist;
            total += element.total;
          });

          expect(total).to.be.equal(4);

          done();
        });
      } else {
        var err = new Error('POSTGRES SPECIFIC: dojos.js makes postgres-specific query which is not supported in other stores: query:{limit$:\'NULL\'} in cmd_my_dojos');
        done(err);
      }
    });
  });

  lab.experiment.skip('Dojos by country', function(){
    lab.test('list dojos by country', function(done){
      seneca.act({role: role, cmd: 'dojos_by_country', countries:{US:'', BR:'', RO:''}}, function(err, dojos){
        if(err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(3);
        expect(util.inspect(dojos).toString()).to.contain.any('America', 'Brazil', 'Romania');

        done();
      });
    });
  });

  lab.experiment.skip('Dojos state count', function () {
    lab.test('list dojos by states in country', function (done) {
      seneca.util.recurse(2, function (index, next) {
        create_dojo(dojos[4 + index], users[index],
          function (err, dojo) {
            if (err) return done(err);
            expect(dojo).to.exist;
            next();
          });
      }, function (err, data) {

        if (using_postgres) {
          seneca.act({role: role, cmd: 'dojos_state_count', country: 'UK'}, function (err, dojos) {
            if (err) return done(err);

            expect(dojos).to.exist;
            expect(dojos.UK).to.exist;
            expect(Object.keys(dojos.UK).length).to.equal(2);

            done();
          });
        } else {
          var err = new Error('POSTGRES SPECIFIC: dojos.js makes postgres-specific query which is not supported in other stores: query:{limit$:\'NULL\'} in cmd_my_dojos');
          done(err);
        }
      });
    });
  });

  lab.experiment('Bulk update', function(){
    lab.test('update many dojos', function(done){
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

          expect(dojos).not.to.be.empty;

          var value = 'updated.';
          _.each(dojos, function(element){
            element.verified = 0;
            element.notes = value;
          });

          seneca.act({role: role, cmd: 'bulk_update', dojos:dojos, user: {roles: ['cdf-admin']}}, function(err, dojos){
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

  lab.experiment('Bulk delete', function(){
    lab.test.skip('delete many dojos', function(done){
      dojosEnt.list$({alpha2:'UK'}, function(err, dojos){
        if(err) return done(err);

        expect(dojos).not.to.be.empty;

        seneca.act({role: role, cmd: 'bulk_delete', dojos:dojos, user: {roles: ['cdf-admin']}}, function(err, dojos){
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

  lab.experiment.skip('Get stats', function () {
    lab.test('list each dojo stats', function (done) {
      if (using_postgres) {
        seneca.act({role: role, cmd: 'get_stats'}, function (err, dojos) {
          if (err) return done(err);

          expect(dojos).not.to.be.empty;
          expect(dojos.EU).to.exist;
          expect(dojos.EU.length).to.equal(2);
          expect(dojos.EU.toString()).to.contain.all('Romania', 'Russia');
          expect(dojos.NA).to.exist;
          expect(dojos.NA.length).to.equal(1);
          expect(dojos.NA.toString()).to.contain('America');
          expect(dojos.SA).to.exist;
          expect(dojos.SA.length).to.equal(1);
          expect(dojos.SA.toString()).to.contain('Brazil');

          done();
        });
      }
      else {
        var err = new Error('POSTGRES SPECIFIC: cd/stat is a postgres view - a feature unavailable in other stores');
        done(err);
      }
    });
  });


  lab.experiment('Load dojo lead', function(){
    lab.test('load dojo lead based on its id', function(done){
      dojoLeadsEnt.list$(function(err, dojoLeads){

      expect(dojoLeads).not.to.be.empty;
      expect(dojoLeads[0].id).to.be.ok;

        seneca.act({role: role, cmd: 'load_dojo_lead', id: dojoLeads[0].id}, function(err, loadedLead){
          if(err) return done(err);

          expect(loadedLead).to.exist;
          expect(loadedLead.userId).to.be.ok;
          expect(loadedLead.email).to.be.ok;
          expect(loadedLead.id).to.equal(dojoLeads[0].id);

          done();
        });
      });
    });
  });

  lab.experiment('Load setup dojo steps', function(){
    lab.test('load dojo wizard steps', function(done){
      seneca.act({role: role, cmd: 'load_setup_dojo_steps'}, function(err, dojoSteps){
        if(err) return done(err);

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

        // TODO: find a way to feed array into include assertion
        expect(all_keys).to.include('title')
        expect(all_keys).to.include('checkboxes')

        done();
      });
    });
  });

  lab.experiment('Load users dojos', function(){
    lab.test('load usersDojo based on query', function(done){
      seneca.util.recurse(2, function( index, next ){
      create_dojo(dojos[4+index], users[index],
        function(err, dojo){
          if(err) return done(err);
          expect(dojo).to.exist;
          next();
        });
      }, function(err, data) {

        usersDojosEnt.list$(function(err, dojos){

        expect(dojos).not.to.be.empty;
        expect(dojos[0].id).to.be.ok;

          // there should be two usersDojos with userId 1001
          seneca.act({role: role, cmd: 'load_usersdojos', query: {userId: dojos[1].userId}},
          function(err, loadedDojos){
            if(err) return done(err);

            expect(loadedDojos).to.exist;
            expect(loadedDojos.length).to.equal(3); //cause one of them is deleted during tests
            expect(loadedDojos[0].userId).to.be.ok;
            expect(loadedDojos[1].userId).to.be.ok;
            expect(loadedDojos[0].userId).to.equal(loadedDojos[1].userId);

            done();
          });
        });
      });
    });
  });

});
