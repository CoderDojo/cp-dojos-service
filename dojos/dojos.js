'use strict';

var _ = require('lodash');
var path = require('path');
var async = require('async');
var ObjectID = require('mongodb').ObjectID;

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-dojos';
  var ENTITY_NS = 'cd/dojos';
  var USER_DOJO_ENTITY_NS = "cd/usersdojos";


  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'delete'}, cmd_delete);
  seneca.add({role: plugin, cmd: 'my_dojos_count'}, cmd_my_dojos_count);
  seneca.add({role: plugin, cmd: 'my_dojos_search'}, cmd_my_dojos_search);


  function cmd_search(args, done){
    var seneca = this, query = {}, dojos_ent;
    query = args.query;
    dojos_ent = seneca.make$(ENTITY_NS);
    dojos_ent.list$(query, done);
  }

  function cmd_list(args, done) {
    var seneca = this;
    //Temporarily hard code limit
    seneca.make(ENTITY_NS).list$({limit$: 1500}, function(err, response) {
      if(err) return done(err);
      var dojosByCountry = {};
      response = _.sortBy(response, 'countryName');
      async.each(response, function(dojo, dojoCb) {
        if(dojo.deleted === 1 || dojo.verified === 0 || dojo.stage !== 2) return dojoCb();
        var id = dojo.id;
        if(!dojosByCountry[dojo.countryName]) {
          dojosByCountry[dojo.countryName] = {};
          dojosByCountry[dojo.countryName].dojos = [];
          dojosByCountry[dojo.countryName].dojos.push(dojo);
        } else {
          dojosByCountry[dojo.countryName].dojos.push(dojo);
        }
        dojoCb();
      }, function() {
        var countries = Object.keys(dojosByCountry);
        async.eachSeries(countries, function(countryName, cb) {
          dojosByCountry[countryName].dojos = _.sortBy(dojosByCountry[countryName].dojos, 'name');
          cb();
        }, function() {
          done(null, dojosByCountry);
        });
      });
    });
  }

  function cmd_create(args, done){
    var seneca = this, dojo = args.dojo;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
    var createdby = args.user;
    var userDojo = {};

    dojo.countryName = dojo.country;

    delete dojo.country;

    seneca.make$(ENTITY_NS).save$(dojo, function(err, dojo) {
      if(err) return done(err);
      
      userDojo.owner = 1;
      userDojo.user_id = createdby;
      userDojo.dojo_id = dojo.id;
      
      usersDojosEntity.save$(userDojo, function(err, response) {
        if(err) return done(err);

        done(null, dojo);
      });
    });
  }

  function cmd_update(args, done){
    var seneca = this;
    var dojo = args.dojo;

    dojo.countryName = dojo.country;
    delete dojo.country;

    seneca.make(ENTITY_NS).save$(dojo, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_delete(args, done){
    var seneca = this;
    var id = args.id;
    var userId = args.user;


    seneca.make$(ENTITY_NS).remove$(args.id, function(err){
      if(err){
        return done(err);
      }

      seneca.make$(USER_DOJO_ENTITY_NS).load$({user_id: userId, dojo_id: id}, function(err, userDojo){
        if(err){
          return done(err);
        }

        seneca.make$(USER_DOJO_ENTITY_NS).remove$(userDojo.id, function(err){
          if(err){
            return done(err);
          }

          done();
        })

      })
    });
  }

  function cmd_my_dojos_count(args, done) {
    var seneca = this, query = {};
    var user = args.user;
    seneca.make$(USER_DOJO_ENTITY_NS).list$({user_id: user.id}, function(err, response){
      if(err){
        return done(err);
      }

      done(null, response.length);
    });
  }

  function cmd_my_dojos_search(args, done){
    var seneca = this, query = {};
    var user = args.user;
    var userObj = {};
    var dojoIds = [];
    
    query = args.query;


    if(query.skip !== undefined){
      query.skip$ = query.skip;
      delete query.skip;
    }

    if(query.limit !== undefined){
      query.limit$ = query.limit;
      delete query.limit;
    }

    if(query.sort !== undefined){
      query.sort$ = query.sort;
      delete query.sort;
    }

    userObj.user_id = user.id; 

    seneca.make$(USER_DOJO_ENTITY_NS).list$(userObj, function(err, response){
      if(err){
        return done(err);
      }

      dojoIds = _.pluck(response, 'dojoId');

      query.ids = dojoIds;

      seneca.make$(ENTITY_NS).list$(query, function(err, response) {
        if(err) return done(err);
        done(null, response);
      });
    });
  }

  return {
    name: plugin
  };

};