'use strict';

var seneca = require('seneca')(),
    express = require('express'),
    config = require('config'),
    request = require('supertest');

var bodyparser   = require('body-parser')

var app = require('express')()

seneca.use( require('seneca-web') );
seneca.use('../dojos.js');

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json({ limit: 100000}));
app.use(seneca.export('web'));

console.log(config.db);


seneca.use('mongo-store', config.db)

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

var testResponse = [ { 
  'entity$': '-/cd/dojos',
  name: 'Test',
  creator: 999999,
  created: '2015-03-12T02:49:49.000Z',
  verified_at: null,
  verified_by: null,
  verified: 0,
  need_mentors: 0,
  stage: 0,
  time: 'Thursday, once a month, 6-8pm',
  country: 'US',
  location: 'Test Public Library',
  coordinates: '40.4917889,-74.4453375',
  notes: '<p>None</p>',
  email: null,
  website: 'http://test.com',
  twitter: null,
  google_group: null,
  eb_id: null,
  supporter_image: null,
  deleted: 0,
  deleted_by: null,
  deleted_at: null,
  private: 0,
  url_slug: null,
  continent: 'NA',
  alpha2: 'US',
  alpha3: 'USA',
  number: 840,
  country_name: 'United States of America',
  id: '9999999' }];


describe('Dojo Microservice test', function(){

  before(function(done){
    seneca.ready(function(){
      request(app)
        .post('/dojos')
        .send({dojo: testDojo})
        .end(function(err, res){
          if (err) return done(err);
          done();
        });
    });
  })

  describe('POST /dojos/search', function(){
    it('respond with json', function(done){      
      seneca.ready(function(){
        request(app)
          .post('/dojos/search')
          .send({query:{_id: testDojo.id}})
          .expect(200, testResponse ,done);
      });
    });
  });

  after(function(done){
    seneca.ready(function(){
      request(app)
        .delete('/dojos/' + testDojo.id)
        .end(function(err, res){
          if (err) return done(err);
          done();
        });
    });
  });

});