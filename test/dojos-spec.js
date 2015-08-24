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

seneca.options(config);

seneca
  .use(__dirname + '/stubs/cd-agreements.js')
  .use(__dirname + '/stubs/cd-countries.js')
  .use(__dirname + '/stubs/cd-profiles.js')
  .use(__dirname + '/../dojos.js', {limits: {maxUserDojos: 10}});

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

    done(null, savedDojo);
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
      dojos[index].userId = users[index].id
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
    lab.test('executes', function(done){
      seneca.act({role: role, cmd: 'list'}, function(err, dojos){
        if(err) return done(err);

        expect(dojos).to.be.an('array');
        expect(dojos).to.have.length(0);

        done();
      });
    });

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

  lab.experiment('My dojos', function () {
    lab.test('executes', function (done) {
      seneca.act({role: role, cmd: 'my_dojos', user: users[0], search: {}}, done);
    });

    lab.test.skip('list all dojos related to user', function (done) {
      seneca.act({role: role, cmd: 'my_dojos', user: users[0], search: {}}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.total).to.be.equal(1);
        expect(dojos.records[0]).to.be.ok;

       done();
      });
    });
  });

  lab.experiment('Dojos count (uses countries-stub)', function () {
    lab.test('executes', function (done) {
      seneca.act({role: role, cmd: 'dojos_count'}, done);
    });

    lab.test.skip('list dojos count per geographical location', function (done) {
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
    });
  });

  lab.experiment('Dojos by country', function(){
    lab.test('executes', function(done){
      seneca.act({role: role, cmd: 'dojos_by_country', countries:{US:'', BR:'', RO:''}}, done);
    });

    lab.test.skip('list dojos by country', function(done){
      seneca.act({role: role, cmd: 'dojos_by_country', countries:{US:'', BR:'', RO:''}}, function(err, dojos){
        if(err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(3);
        expect(util.inspect(dojos).toString()).to.contain.any('America', 'Brazil', 'Romania');

        done();
      });
    });
  });

  lab.experiment('Dojos state count', function () {
    lab.test('executes', function (done) {
      seneca.act({role: role, cmd: 'dojos_state_count', country: 'UK'}, done);
    });

    lab.test.skip('list dojos by states in country', function (done) {
      seneca.util.recurse(2, function (index, next) {
        create_dojo(dojos[4 + index], users[index],
          function (err, dojo) {
            if (err) return done(err);
            expect(dojo).to.exist;
            next();
          });
      }, function (err, data) {

        seneca.act({role: role, cmd: 'dojos_state_count', country: 'UK'}, function (err, dojos) {
          if (err) return done(err);

          expect(dojos).to.exist;
          expect(dojos.UK).to.exist;
          expect(Object.keys(dojos.UK).length).to.equal(2);

          done();
        });
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
    lab.test.skip('executes', function(done){
      seneca.act({role: role, cmd: 'bulk_delete', dojos:dojos, user: {roles: ['cdf-admin']}}, done);
    });

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

  lab.experiment('Get stats', function () {

    lab.test.skip('executes', function (done) {
      seneca.act({role: role, cmd: 'get_stats'}, done);
    });

    lab.test.skip('list each dojo stats', function (done) {

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

  lab.experiment('search', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'search', query: {} }, done);
    });
  });
  lab.experiment('list', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'list' }, done);
    });
  });
  lab.experiment('load', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'load' }, done);
    });
  });
  lab.experiment('find', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'find' }, done);
    });
  });
  lab.experiment('create', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'create', user: {}, dojo: {} }, done);
    });
  });
  lab.experiment('update', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'update' }, done);
    });
  });
  lab.experiment('delete', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'delete' }, done);
    });
  });
  lab.experiment('my_dojos', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'my_dojos' }, done);
    });
  });
  lab.experiment('dojos_count', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'dojos_count' }, done);
    });
  });
  lab.experiment('dojos_by_country', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'dojos_by_country' }, done);
    });
  });
  lab.experiment('dojos_state_count', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'dojos_state_count' }, done);
    });
  });
  lab.experiment('bulk_update', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'bulk_update' }, done);
    });
  });
  lab.experiment('bulk_delete', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'bulk_delete' }, done);
    });
  });
  lab.experiment('get_stats', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'get_stats' }, done);
    });
  });
  lab.experiment('save_dojo_lead', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'save_dojo_lead' }, done);
    });
  });
  lab.experiment('update_dojo_lead', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'update_dojo_lead' }, done);
    });
  });
  lab.experiment('load_user_dojo_lead', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'load_user_dojo_lead' }, done);
    });
  });
  lab.experiment('load_dojo_lead', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'load_dojo_lead' }, done);
    });
  });
  lab.experiment('load_setup_dojo_steps', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'load_setup_dojo_steps' }, done);
    });
  });
  lab.experiment('load_usersdojos', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'load_usersdojos' }, done);
    });
  });
  lab.experiment('load_dojo_users', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'load_dojo_users' }, done);
    });
  });
  lab.experiment('send_email', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'send_email' }, done);
    });
  });
  lab.experiment('generate_user_invite_token', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'generate_user_invite_token' }, done);
    });
  });
  lab.experiment('accept_user_invite', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'accept_user_invite' }, done);
    });
  });
  lab.experiment('request_user_invite', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'request_user_invite' }, done);
    });
  });
  lab.experiment('load_dojo_champion', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'lead_dojo_champion' }, done);
    });
  });
  lab.experiment('accept_user_request', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'accept_user_request' }, done);
    });
  });
  lab.experiment('dojos_for_user', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'dojos_for_user' }, done);
    });
  });
  lab.experiment('save_usersdojos', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'save_usersdojos' }, done);
    });
  });
  lab.experiment('remove_usersdojos', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'remove_usersdojos' }, done);
    });
  });
  lab.experiment('get_user_types', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'get_user_types' }, done);
    });
  });
  lab.experiment('get_user_permissions', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'get_user_permissions' }, done);
    });
  });
  lab.experiment('create_dojo_email', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'create_dojo_email' }, done);
    });
  });
  lab.experiment('search_dojo_leads', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'search_dojo_leads' }, done);
    });
  });
  lab.experiment('uncompleted_dojos', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'uncompleted_dojos' }, done);
    });
  });
  lab.experiment('get_dojo_config', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'get_dojo_config' }, done);
    });
  });
  lab.experiment('load_dojo_admins', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'load_dojo_admins' }, done);
    });
  });
  lab.experiment('update_founder', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'update_founder' }, done);
    });
  });
  lab.experiment('search_nearest_dojos', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'search_nearest_dojos' }, done);
    });
  });
  lab.experiment('search_bounding_box', function () {
    lab.test.skip('executes', function (done) {
      seneca.act({ role: role, cmd: 'search_bounding_box' }, done);
    });
  });
  lab.experiment('list_query', function () {
    lab.test('executes', function (done) {
      seneca.act({ role: role, cmd: 'list_query' }, done);
    });
  });

});
