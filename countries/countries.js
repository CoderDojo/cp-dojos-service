'use strict';

var _ = require('lodash');
var path = require('path');
var async = require('async');
var http = require('http');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-countries';
  var ENTITY_NS = 'cd/countries';

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'load_children'}, cmd_load_children);
  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'delete'}, cmd_delete);
  
  function cmd_list(args, done){
    var seneca = this, query;
    query = args.query ?  args.query : {};
    http.get("http://api.geonames.org/countryInfoJSON?formatted=true&lang=en&username=davidc&style=full", function(res) {
      var countries = '';
      res.setEncoding('utf8');
      res.on("data", function(chunk) {
        countries += chunk;
      });
      res.on('end', function() {
        countries = JSON.parse(countries);
        countries = countries.geonames;
        countries = _.sortBy(countries, 'countryName');
        done(null, countries);
      });
    }).on('error', function(e) {
      done(null, []);
    });
  }

  function cmd_load_children(args, done) {
    var seneca = this;
    var geonameId = args.geonameId;

    http.get("http://www.geonames.org/childrenJSON?geonameId="+geonameId+"&username=davidc", function(res) {
      var children = '';
      res.setEncoding('utf8');
      res.on("data", function(chunk) {
        children += chunk;
      });
      res.on('end', function() {
        children = JSON.parse(children);
        children = children.geonames;
        children = _.sortBy(children, 'toponymName');
        done(null, children);
      });
    }).on('error', function(e) {
      done(null, []);
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