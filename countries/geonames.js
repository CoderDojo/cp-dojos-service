'use strict';

var _ = require('lodash');
var async = require('async');
var http = require('http');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-geonames';

  var COUNTRY_NS = 'cd/countries';
  var GEONAME_NS = 'cd/geonames';

  seneca.add({role: plugin, cmd: 'list_countries'}, cmd_list_countries);
  seneca.add({role: plugin, cmd: 'list_places'}, cmd_list_places);
  seneca.add({role: plugin, cmd: 'countries_lat_long'}, cmd_countries_lat_long);
  seneca.add({role: plugin, cmd: 'continents_lat_long'}, cmd_continents_lat_long);
  seneca.add({role: plugin, cmd: 'countries_continents'}, cmd_countries_continents);


  var continent_codes = {
    'Africa': 'AF',
    'Antarctica': 'AN',
    'Asia': 'AS',
    'Europe': 'EU',
    'Oceania': 'OC',
    'North America': 'NA',
    'South America': 'SA'
  };


  function cmd_list_countries(args, done){
    var seneca = this;
    seneca.make(COUNTRY_NS).list$({}, function(err, response) {
      if(err){
        return done(err);
      } else {
        return done(null, response);
      }
    });
  }

  function cmd_list_places(args, done) {
    var seneca = this;

    var query = {
      feature_class: 'P',
      $or: [
        {name: new RegExp('^'+args.search, 'i')},
        {alternatenames: new RegExp('^'+args.search, 'i')},
        {asciiname: new RegExp('^'+args.search, 'i')}
      ],
      country_code: args.countryCode,
      limit$: 100,
      sort$: { name: 1 }
    }

    query.feature_class = 'P';
    query.limit$ = 100;
    query.sort$ = {};

    function getNameWithHierarchy(geo) {
      return _.reduce(['4', '3', '2', '1'], function(key, idx) {
        if (geo['admin' + idx + '_name']) {
          return key + ', ' + geo['admin' + idx + '_name'];
        }
        else {
          return key;
        }
      }, geo.name);
    }

    async.waterfall([
      function(done) {
        seneca.make(GEONAME_NS).list$(query, done)
      },
      function(geonames) {
        return done(null, _.map(geonames, function(geo) {
          return {
            toponymName: getNameWithHierarchy(geo),
            geonameId: geo.geoid
          }
        }));
      }
    ], done);
  }


  function cmd_countries_continents(args, done) {
    async.waterfall([
      function(done) {
        seneca.make(GEONAME_NS).list$({feature_class:'L', feature_code: 'CONT'}, done);
      },
      function(continents, done) {
        seneca.make(COUNTRY_NS).list$({}, _.partialRight(done, continents));
      },
      function(countries, continents, done) {
        return done(null, {
          countries: _.indexBy(countries, 'alpha2'),
          continents: _.indexBy(continents, function(continent) {
            return continent_codes[continent.name];
          })
        });
      }
    ], done);
    done(null, countriesList);
  }


  function cmd_continents_lat_long(args, done) {
    async.waterfall([
      function(done) {
        seneca.make(GEONAME_NS).list$({feature_class:'L', feature_code: 'CONT'}, done);
      },
      function(continents, done) {
        var response = {};
        _.each(continents, function(continent) {
          response[continent_codes[continent.name]] = [continent.latitude, continent.longitude];
        });
        return done(null, response);
      }
    ], done);
  }

  function cmd_countries_lat_long(args, done) {
    done(null, data);
  }


  return {
    name: plugin
  };

};