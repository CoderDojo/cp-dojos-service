'use strict';

var _ = require('lodash');
var path = require('path');
var async = require('async');
var countriesList = require('countries-list');
var http = require('http');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-countries';
  var ENTITY_NS = 'cd/countries';

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'delete'}, cmd_delete);
  seneca.add({role: plugin, cmd: 'countries_lat_long'}, cmd_countries_lat_long);
  seneca.add({role: plugin, cmd: 'continents_lat_long'}, cmd_continents_lat_long);
  seneca.add({role: plugin, cmd: 'countries_continents'}, cmd_countries_continents);
  seneca.add({role: plugin, cmd: 'county_from_coordinates'}, cmd_county_from_coordinates);
  
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

  function cmd_county_from_coordinates(args, done) {
    var coordinates = args.coordinates.split(',');
    http.get("http://api.geonames.org/countrySubdivisionJSON?formatted=true&lang=en&username=davidc&style=full&lat="+coordinates[0]+"&lng="+coordinates[1], function(res) {
      var county = '';
      res.setEncoding('utf8');
      res.on("data", function(chunk) {
        county += chunk;
      });
      res.on('end', function() {
        county = JSON.parse(county);
        done(null, county);
      });
    }).on('error', function(e) {
      done(null, []);
    });
  }

  function cmd_countries_continents(args, done) {
    done(null, countriesList);
  }

  function cmd_continents_lat_long(args, done) {
    var data = require('./data/continents_lat_long.json');
    done(null, data);
  }

  function cmd_countries_lat_long(args, done) {
    var data = require('./data/countries_lat_long.json');
    done(null, data);
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