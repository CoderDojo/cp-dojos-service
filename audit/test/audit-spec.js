'use strict';

var seneca = require('seneca')(),
    express = require('express'),
    config = require('config'),
    request = require('supertest');

var bodyparser   = require('body-parser');

var app = require('express')();

var expect = require("chai").expect;

seneca.use( require('seneca-web') );
seneca.use('../audit.js');

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json({ limit: 100000}));
app.use(seneca.export('web'));

var dojoEnt = seneca.make$('cd/dojos');
var auditEnt = seneca.make$('audit/audit');

seneca.use('mongo-store', config.db);

var testDojo = {
  "id": 9999999,
  "name": "Test",
  "creator": 999999,
  "created": "2015-03-12T02:49:49.000Z",
  "verified_at": null,
  "verified_by": null,
  "verified": 0,
  "need_mentors": 0,
  "stage": 0,
  "time": "Thursday, once a month, 6-8pm",
  "country": "US",
  "location": "Test Public Library",
  "coordinates": "40.4917889,-74.4453375",
  "notes": "<p>None</p>",
  "email": null,
  "website": "http://test.com",
  "twitter": null,
  "google_group": null,
  "eb_id": null,
  "supporter_image": null,
  "deleted": 0,
  "deleted_by": null,
  "deleted_at": null,
  "private": 0,
  "url_slug": null,
  "continent": "NA",
  "alpha2": "US",
  "alpha3": "USA",
  "number": 840,
  "country_name": "United States of America"
}

describe('Audit Microservice test', function(){
  before(function(done){
    seneca.ready(function(){
      dojoEnt.native$(function(err, db){
        var collection = db.collection("audit_audit");
        collection.remove({}, function(err, noRemoved){
          if(err){
            return done(err);
          } else {
            return done();
          }
        })
      });
    });
  }); 
  

  before(function(done){
    seneca.ready(function(){
      dojoEnt.save$(testDojo, function(err, dojo){
        if(err){
          return done(err);
        } else {
          return done();
        }
      });
    });
  })

  describe('Audit entry', function(){
    it('should have exactly one entry', function(done){      
      auditEnt.list$({}, function(err, entry){
        if(err){
          return done(err);
        } else {
          expect(entry.length).to.be.equal(1);
          return done();
        }
      });
    });
  });


});