'use strict';

var seneca = require('seneca')(),
    config = require('config'),
    async = require('async');

var expect = require('chai').expect;

console.log('using configuration', JSON.stringify(config, null, 4));
seneca.options(config);
seneca.use('mongo-store', config.db);
seneca.use('../countries.js');



var countries = [{
    "continent": "SA",
    "alpha2": "VE",
    "alpha3": "VEN",
    "number": 862,
    "country_name": "Venezuela, Bolivarian Republic of"
  },
  {
    "continent": "OC",
    "alpha2": "WF",
    "alpha3": "WLF",
    "number": 876,
    "country_name": "Wallis and Futuna"
  },
  {
    "continent": "OC",
    "alpha2": "WS",
    "alpha3": "WSM",
    "number": 882,
    "country_name": "Samoa, Independent State of"
  },
  {
    "continent": "AS",
    "alpha2": "YE",
    "alpha3": "YEM",
    "number": 887,
    "country_name": "Yemen"
  },
  {
    "continent": "AF",
    "alpha2": "ZM",
    "alpha3": "ZMB",
    "number": 894,
    "country_name": "Zambia, Republic of"
  }
];

describe('Countries Microservice test', function(){
  var countryEnt = seneca.make$('cd/countries');

  before(function(done){
    seneca.ready(function(){
      countryEnt.native$(function(err, db){
        var collection = db.collection('cd_countries');
        collection.remove({}, function(err, noRemoved){
          if(err){
            return done(err);
          } else {
            return done();
          }
        });
      });
    });
  }); 
  
  before(function(done){
    function createCountries(country, cb){
      seneca.act({role: 'cd-countries', cmd: 'create', country:  country}, function(err, res){
        if(err){
          return cb(err);
        }

        return cb();
      });
    }

    var loadCountries = function (done) {
      async.eachSeries(countries, createCountries , done);
    };

    async.series([
      loadCountries
    ], done);
  });

  describe('Countries list', function(){
    it('should return all 5 entries', function(done){      
      seneca.act({role: 'cd-countries', cmd: 'list'}, {}, function(err, countries){
        if(err){
          return done(err)
        } else {
          expect(countries).to.not.be.undefined;
          expect(countries.length).to.be.equal(5);
          return done();
        }
      });
    });
  });

});