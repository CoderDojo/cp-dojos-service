'use strict';

var _ = require('lodash');
var path = require('path');
var async = require('async');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-countries';
  var ENTITY_NS = 'cd/countries';

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'delete'}, cmd_delete);
  
  function cmd_list(args, done){
    var seneca = this, query;
    query = args.query ?  args.query : {};
    seneca.make(ENTITY_NS).list$(query, function(err, response) {
      if(err){
        return done(err);
      } else {
        return done(null, response);
      }
    });
  }

  function cmd_create(args, done){
    var seneca = this, country = args.country;
    seneca.make$(ENTITY_NS).save$(country, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_update(args, done){
    var seneca = this, country = args.country;
    seneca.make(ENTITY_NS).save$(country, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_delete(args, done){
    var seneca = this;
    var id = args.id;
    seneca.make$(ENTITY_NS).remove$(args.id, done);
  }


  return {
    name: plugin
  };

};