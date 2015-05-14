'use strict';

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-countries';
  var ENTITY_NS = 'cd/countries';

  var fs = require('fs');

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'delete'}, cmd_delete);
  seneca.add({role: plugin, cmd: 'countries_lat_long'}, cmd_countries_lat_long);
  seneca.add({role: plugin, cmd: 'continents_lat_long'}, cmd_continents_lat_long);
  seneca.add({role: plugin, cmd: 'countries_continents'}, cmd_countries_continents);
  seneca.add({role: plugin, cmd: 'county_from_coordinates'}, cmd_county_from_coordinates);
  
  function cmd_list(args, done){
    done(new Error('action not mocked!'), null)
  }

  function cmd_county_from_coordinates(args, done) {
    done(new Error('action not mocked!'), null)
  }

  function cmd_countries_continents(args, done) {
    var response = JSON.parse(fs.readFileSync(__dirname + '/fixtures/countries_continents.json', 'utf8'));
    done(null, response)
  }

  function cmd_continents_lat_long(args, done) {
    done(new Error('action not mocked!'), null)
  }

  function cmd_countries_lat_long(args, done) {
    done(new Error('action not mocked!'), null)
  }

  function cmd_create(args, done){
    done(new Error('action not mocked!'), null)
  }

  function cmd_update(args, done){
    done(new Error('action not mocked!'), null)
  }

  function cmd_delete(args, done){
    done(new Error('action not mocked!'), null)
  }

  return {
    name: plugin
  };

};