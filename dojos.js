'use strict';

var util = require('util');
var _ = require('lodash');
var async = require('async');
var slug = require('slug');
var shortid = require('shortid');
var crypto = require('crypto');
var randomstring = require('randomstring');
var fs = require('fs');
var moment = require('moment');

var google = require('googleapis');
var admin = google.admin('directory_v1');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-dojos';
  var ENTITY_NS = 'cd/dojos';
  var USER_DOJO_ENTITY_NS = "cd/usersdojos";
  var STATS_ENTITY_NS = "cd/stats";
  var DOJO_LEADS_ENTITY_NS = "cd/dojoleads";
  var CDF_ADMIN = 'cdf-admin';
  var DEFAULT_INVITE_USER_TYPE = 'mentor';
  var setupDojoSteps = require('./data/setup_dojo_steps');

  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'find'}, cmd_find);
  seneca.add({role: plugin, cmd: 'create'}, wrapCheckRateLimitCreateDojo(cmd_create));
  seneca.add({role: plugin, cmd: 'update'}, wrapDojoExists(wrapDojoPermissions(cmd_update)));
  seneca.add({role: plugin, cmd: 'delete'}, wrapDojoExists(wrapDojoPermissions(cmd_delete)));
  seneca.add({role: plugin, cmd: 'my_dojos'}, cmd_my_dojos);
  seneca.add({role: plugin, cmd: 'dojos_count'}, cmd_dojos_count);
  seneca.add({role: plugin, cmd: 'dojos_by_country'}, cmd_dojos_by_country);
  seneca.add({role: plugin, cmd: 'dojos_state_count'}, cmd_dojos_state_count);
  seneca.add({role: plugin, cmd: 'bulk_update'}, cmd_bulk_update);
  seneca.add({role: plugin, cmd: 'bulk_delete'}, cmd_bulk_delete);
  seneca.add({role: plugin, cmd: 'get_stats'}, wrapCheckCDFAdmin(cmd_get_stats));
  seneca.add({role: plugin, cmd: 'save_dojo_lead'}, cmd_save_dojo_lead);
  seneca.add({role: plugin, cmd: 'update_dojo_lead'}, cmd_save_dojo_lead);
  seneca.add({role: plugin, cmd: 'load_user_dojo_lead'}, cmd_load_user_dojo_lead);
  seneca.add({role: plugin, cmd: 'load_dojo_lead'}, cmd_load_dojo_lead);
  seneca.add({role: plugin, cmd: 'load_setup_dojo_steps'}, cmd_load_setup_dojo_steps);
  seneca.add({role: plugin, cmd: 'load_usersdojos'}, cmd_load_users_dojos);
  seneca.add({role: plugin, cmd: 'load_dojo_users'}, cmd_load_dojo_users);
  seneca.add({role: plugin, cmd: 'send_email'}, cmd_send_email);
  seneca.add({role: plugin, cmd: 'generate_user_invite_token'}, cmd_generate_user_invite_token);
  seneca.add({role: plugin, cmd: 'accept_user_invite'}, cmd_accept_user_invite);
  seneca.add({role: plugin, cmd: 'request_user_invite'}, cmd_request_user_invite);
  seneca.add({role: plugin, cmd: 'load_dojo_champion'}, cmd_load_dojo_champion);
  seneca.add({role: plugin, cmd: 'accept_user_request'}, cmd_accept_user_request);
  seneca.add({role: plugin, cmd: 'dojos_for_user'}, cmd_dojos_for_user);
  seneca.add({role: plugin, cmd: 'save_usersdojos'}, cmd_save_usersdojos);
  seneca.add({role: plugin, cmd: 'remove_usersdojos'}, cmd_remove_usersdojos);
  seneca.add({role: plugin, cmd: 'get_user_types'}, cmd_get_user_types);
  seneca.add({role: plugin, cmd: 'get_user_permissions'}, cmd_get_user_permissions);
  seneca.add({role: plugin, cmd: 'create_dojo_email'}, cmd_create_dojo_email);
  seneca.add({role: plugin, cmd: 'search_dojo_leads'}, cmd_search_dojo_leads);
  seneca.add({role: plugin, cmd: 'uncompleted_dojos'}, cmd_uncompleted_dojos);

  function cmd_create_dojo_email(args, done) {
    if (!args.dojo) {
      return done('Dojo data is missing.');
    }

    if(options['google-api'].enabled === false) {
      return done();
    }

    //check if Google API private key file exists
    if (!fs.existsSync(options['google-api'].keyFile)) {
      return done("Google API private key not found", null);
    }

    var jwt = new google.auth.JWT(
      options['google-api'].email,
      options['google-api'].keyFile,
      "",
      options['google-api'].scopes,
      options['google-api'].subject
    );

    jwt.authorize(function (err, data) {
      if (err) {
        return done(err)
      }

      getGoogleUserData(args.dojo, function (err, res) {

        var googleNewAccountData = res.userData;
        var tempPass = googleNewAccountData.tempPass;
        googleNewAccountData = _.omit(googleNewAccountData, 'tempPass');
        var dojo = res.dojo;

        // Insert user
        admin.users.insert({
          resource: googleNewAccountData,
          auth: jwt
        }, function (err, data) {
          if (err) {
            return done(err)
          }

          seneca.act({role: 'cd-users', cmd: 'load', id: dojo.creator}, function (err, dojoCreator) {
            if (err) {
              return done(err)
            }

            //send dojo creator an email with dojo's newly created email address and it's temp password
            var payload = {
              to: dojoCreator.email,
              code: 'google-email-pass',
              content: {temp_pass: tempPass, dojo: dojo.name, email: googleNewAccountData.primaryEmail}
            };
            seneca.act({role: plugin, cmd: 'send_email', payload: payload}, function (err, res) {
              if (err) {
                return done(err)
              }

              done(null, data);
            });
          });
        });
      });
    });
  }

  function getGoogleUserData(dojo, done) {
    var userData = {};

    seneca.act('role:cd-dojos,cmd:load', {id: dojo.id}, function (err, res) {
      if (err) {
        return done(err)
      }

      dojo = res.data$();

      //this can look something like this: nsc-mahon-cork.ie@coderdojo.com
      var primaryEmail = _.last(dojo.urlSlug.split('/')).concat('.', dojo.alpha2.toLowerCase(), '@coderdojo.com');

      if (process.env.ENVIRONMENT === 'development') {
        primaryEmail = 'dev-' + primaryEmail;
      }

      //required user data
      userData.name = {
        familyName: dojo.name, //this can be changed with the champion name & family name
        givenName: dojo.placeName || dojo.address1
      };
      var pass = randomstring.generate(8);
      userData.tempPass = pass;
      userData.password = sha1sum(pass);//use default pass for now; replace this with random pass when finished
      userData.hashFunction = "SHA-1";
      userData.primaryEmail = primaryEmail;
      userData.changePasswordAtNextLogin = true;
      userData.emails = [
        {
          "address": "cristian.kiss@nearform.com",
          "type": "other",
          "customType": "",
          "primary": false
        }
      ];
      userData.organizations = [
        {
          "name": "nearform_test",
          "title": "champion",
          "primary": true,
          "type": "school",
          "description": "new test dojo",
          domain: 'coderdojo.org'
        }
      ];

      return done(null, {userData: userData, dojo: dojo});
    });
  }

  function sha1sum(input){
    return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex')
  }

  function cmd_search_dojo_leads(args, done){
    async.waterfall([
      function(done) {
        seneca.act('role:cd-dojos-elasticsearch,cmd:search', {search:args.search, type:'cd_dojoleads'}, done);
      },
      function(searchResult, done) {
        return done(null, {
          total: searchResult.total,
          records: _.pluck(searchResult.hits, '_source')
        });
      }
    ], function(err, res) {
      if (err) {
        return done(err);
      }
      return done(null, res);
    });
  }

  function cmd_uncompleted_dojos(args, done){
    var query = { query : {
      filtered : {
        query : {
          match_all : {}
        },
        filter : {
          bool: {
            must: [{
              term: { creator: args.user.id }
            }]
          }
        }
      }
    }
    };

    seneca.act({role: plugin, cmd: 'search', search: query}, function(err, dojos){
      if(err){ return done(err) }
      if(dojos.total > 0) {
        var uncompletedDojos = [];
        async.each(dojos.records, function (dojo, cb) {
          //check if dojo "setup dojo step is completed"
          seneca.act({role: plugin, cmd: 'load_dojo_lead', id: dojo.dojoLeadId}, function (err, dojoLead) {
            if (dojoLead) {
              var isCompleted = checkSetupYourDojoIsCompleted(dojoLead);
              if (!isCompleted) {
                uncompletedDojos.push(dojo);
              }

              cb(null);
            }
          });
        }, function (err) {
          if (err) {
            return done(err);
          }

          return done(null, uncompletedDojos);
        });
      } else return done(null);
    });
  }

  function checkSetupYourDojoIsCompleted(dojoLead){
    var isDojoCompleted = true;
    var setupYourDojo = dojoLead.application.setupYourDojo;
    var checkboxes = _.flatten(_.pluck(setupDojoSteps, 'checkboxes'));

    _.each(checkboxes, function(checkbox){
      if(_.isUndefined(setupYourDojo[checkbox.name]) || _.isNull(setupYourDojo[checkbox.name]) || !setupYourDojo[checkbox.name]){
        isDojoCompleted = false;
      }

      if(checkbox.textField){
        if(_.isNull(setupYourDojo[checkbox.name + "-text"]) ||
          _.isUndefined(setupYourDojo[checkbox.name + '-text']) ||
          _.isEmpty(setupYourDojo[checkbox.name + '-text'])){
          isDojoCompleted = false;
        }
      }
    });

    return isDojoCompleted;
  }

  function isUserChampionAndDojoAdmin(query, requestingUser, done) {

    if(_.contains(requestingUser.roles, 'cdf-admin')) {
      return done(null, true);
    }

    seneca.act({role:plugin, cmd:'load_usersdojos', query:query}, function (err, response) {
      if(err) return done(err);
      var userDojo = response[0];
      var isDojoChampion  = _.contains(userDojo.userTypes, 'champion');
      var isDojoAdmin = _.find(userDojo.userPermissions, function(userPermission) {
                      return userPermission.name === 'dojo-admin';
                    });
      if(isDojoChampion && isDojoAdmin) return done(null, true);
      return done(null, false);
    });
  }

  function cmd_search(args, done) {
    var usersdojos_ent = seneca.make$(USER_DOJO_ENTITY_NS);
    async.waterfall([
      function(done) {
        seneca.act('role:cd-dojos-elasticsearch,cmd:search', {search:args.search, type: args.type || null}, done);
      },
      function(searchResult, done) {
        var dojos = _.pluck(searchResult.hits, '_source');

        async.each(dojos, function(dojo, cb){

          seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojo.id, owner: 1}},
            function(err, userDojos){

              if(err){
                return cb(err);
              }

              if(userDojos.length < 1){
                return cb();
              }

              var userIds = _.pluck(userDojos, 'userId');

              seneca.act({role: 'cd-users', cmd: 'list', ids: userIds}, function(err, users){
                if(err){
                  return cb(err);
                }

                dojo.creators = _.map(users, function(user){
                  return {email: user.email, id: user.id};
                });

                cb(null, dojo);
              });
            });
          }, function(err) {
            if(err){
              return done(err);
            }

            return done(null, searchResult);
          });
      },
      function(searchResult, done) {
        var userIds = _.chain(searchResult.hits).pluck('_source').pluck('creators').flatten().pluck('id').uniq().value();
        async.waterfall([
          function(done) {
            seneca.act({role:'cd-agreements', cmd:'list', userIds: userIds}, done);
          },
          function(agreements, done) {
            agreements = _.indexBy(agreements, 'userId');
            _.each(_.pluck(searchResult.hits, '_source'), function(dojo) {
              dojo.agreements = [];
              _.each(dojo.creators, function(creator){
                creator.agreements = [];
                if (agreements[creator.id]) {
                  creator.agreements = agreements[creator.id].agreements;
                }
              });
            });
            return done(null, searchResult);
          }
        ], done);
      },
      function(searchResult, done) {
        return done(null, {
          total: searchResult.total,
          records: _.pluck(searchResult.hits, '_source')
        });
      }
    ], function(err, res) {
      if (err) {
        return done(err);
      }
      return done(null, res);
    });
  }

  function cmd_dojos_state_count(args, done) {
    var country = args.country;
    var countData = {};

    seneca.make$(ENTITY_NS).list$({limit$:'NULL', alpha2:country}, function(err, response) {
      if(err) return done(err);
      countData[country] = {};
      _.each(response, function(dojo) {
        if(dojo.coordinates && dojo.deleted !== 1 && dojo.verified !== 0 && dojo.stage !== 4) {
          if(!countData[dojo.alpha2][dojo.admin1Name]) countData[dojo.alpha2][dojo.admin1Name] = {total:0};
          countData[dojo.alpha2][dojo.admin1Name].total += 1;
          countData[dojo.alpha2][dojo.admin1Name].latitude = dojo.coordinates.split(',')[0];
          countData[dojo.alpha2][dojo.admin1Name].longitude = dojo.coordinates.split(',')[1];
        }
      });
      done(null, countData);
    });

  }

  function cmd_dojos_by_country(args, done) {
    var countries = args.countries;
    var dojos = [];
    async.each(Object.keys(countries), function(country, cb) {
      seneca.act({role:plugin, cmd:'list'}, {query:{alpha2:country}}, function(err, response) {
        if(err) return done(err);
        dojos.push(response);
        cb();
      });
    }, function() {
      dojos = _.sortBy(dojos, function(dojo) { return Object.keys(dojo)[0]; });
      done(null, dojos);
    });
  }

  function cmd_dojos_count(args, done) {
    async.waterfall([
      getDojos,
      getCountries,
      getDojoCount
    ], done);

    function getDojos(done) {
      var dojos = [];
      var query = {limit$:'NULL'};
      seneca.make$(ENTITY_NS).list$(query, function(err, response) {
        if(err) return response;
        async.each(response, function(dojo, cb) {
          if(dojo.deleted !== 1 && dojo.verified !== 0 && dojo.stage !== 4) {
            dojos.push(dojo);
          }

          cb();
        }, function() {
          done(null, dojos);
        });
      });
    }

    function getCountries(dojos, done) {
      seneca.act({role:'cd-countries', cmd:'countries_continents'}, function(err, response) {
        if(err) return done(err);
        done(null, dojos, response);
      });
    }

    function getDojoCount(dojos, countries, done) {
      var countData = {dojos:{continents:{}}};
      _.each(dojos, function(dojo) {
        if(countries.countries[dojo.alpha2]) {
          var continent = countries.countries[dojo.alpha2].continent;
          if(!countData.dojos.continents[continent]) countData.dojos.continents[continent] = {total:0, countries:{}};
          countData.dojos.continents[continent].total += 1;
          if(!countData.dojos.continents[continent].countries[dojo.alpha2]) countData.dojos.continents[continent].countries[dojo.alpha2] = {total:0};
          countData.dojos.continents[continent].countries[dojo.alpha2].total += 1;
        }
      });
      done(null, countData);
    }
  }

  function cmd_list(args, done) {
    var query = args.query || {};
    query.limit$ = 1500;
    seneca.make$(ENTITY_NS).list$(query, function(err, response) {
      if(err) return done(err);

      var dojosByCountry = {};
      response = _.sortBy(response, 'countryName');
      _.each(response, function(dojo) {
        if(dojo.deleted !== 1 && dojo.verified !== 0 && dojo.stage !== 4) {
          var id = dojo.id;
          if(!dojosByCountry[dojo.countryName]) {
            dojosByCountry[dojo.countryName] = {};
            dojosByCountry[dojo.countryName].states = {};
            if(!dojosByCountry[dojo.countryName].states[dojo.admin1Name]) dojosByCountry[dojo.countryName].states[dojo.admin1Name] = [];
            dojosByCountry[dojo.countryName].states[dojo.admin1Name].push(dojo);
          } else {
            if(!dojosByCountry[dojo.countryName].states[dojo.admin1Name]) dojosByCountry[dojo.countryName].states[dojo.admin1Name] = [];
            dojosByCountry[dojo.countryName].states[dojo.admin1Name].push(dojo);
          }
        }
      });

      var countries = Object.keys(dojosByCountry);
      _.each(countries, function(countryName) {
        var states = Object.keys(dojosByCountry[countryName].states);
        _.each(states, function(state) {
          dojosByCountry[countryName].states[state] = _.sortBy(dojosByCountry[countryName].states[state], function(dojo) { return dojo.name; } );
        });
      });

      done(null, dojosByCountry);
    });
  }

  function cmd_load(args, done) {
    seneca.make$(ENTITY_NS).load$(args.id, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_find(args, done) {
    seneca.make$(ENTITY_NS).load$(args.query, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  // user can only create X number of dojos
  function wrapCheckRateLimitCreateDojo(f) {
    return function(args, done) {
      seneca.make$(USER_DOJO_ENTITY_NS).list$({user_id: args.user.id}, function(err, data) {
        if (err) return done(err);
        if (data.length >= options.limits.maxUserDojos) {
          return done(null, {ok: false, why: 'Rate limit exceeded, you have already created ' + data.length + ' dojos, the maximum allowed is ' + options.limits.maxUserDojos});
        }

        return f(args, done);
      });
    }
  };

  function cmd_create(args, done){
    var dojo = args.dojo, baseSlug;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
    var user = args.user;
    var userDojo = {};

    dojo.creator = user.id;
    dojo.created = new Date();
    dojo.verified = 0;

    if(dojo.needMentors) {
      dojo.needMentors = 1;
    } else {
      dojo.needMentors = 0;
    }

    var slugify = function(name) {
      return slug(name);
    };

    if (!dojo.geoPoint && dojo.coordinates) {
      var pair = dojo.coordinates.split(',').map(parseFloat);
      if (pair.length === 2 && _.isFinite(pair[0]) && _.isFinite(pair[1])) {
        dojo.geoPoint = {
          lat: pair[0],
          lon: pair[1]
        }
      }
    }

    baseSlug = _.chain([
      dojo.alpha2, dojo.admin1Name, dojo.placeName, dojo.name
    ]).compact().map(slugify).value().join('/').toLowerCase();

    async.waterfall([
      function(cb){
        var urlSlug = {urlSlug: new RegExp('^' + baseSlug,  'i')};
        seneca.make$(ENTITY_NS).list$(urlSlug,function(err, dojos){
          if(err){
            return cb(err);
          }
          var urlSlugs = {};
          if(_.isEmpty(dojos)){
            return cb(null, baseSlug);
          }

          urlSlugs = _.pluck(dojos, 'urlSlug');
          var urlSlug = baseSlug;
          for (var idx = 1; urlSlugs.indexOf(urlSlug) !=  -1; urlSlug = baseSlug + '-' + idx, idx++);

          cb(null, urlSlug);
        });
      }, function(urlSlug, cb){
        dojo.urlSlug = urlSlug;
        seneca.make$(ENTITY_NS).save$(dojo, cb);
      }, function(dojo, cb){
        userDojo.owner = 1;
        userDojo.userTypes = ['champion'];
        userDojo.userPermissions = [
          {title:'Dojo Admin', name:'dojo-admin'},
          {title:'Forum Admin', name:'forum-admin'}, 
          {title:'Ticketing Admin', name:'ticketing-admin'}
        ];
        userDojo.user_id = user.id;
        userDojo.dojo_id = dojo.id;
        usersDojosEntity.save$(userDojo, function (err, userDojo) {
          if(err) return cb(err);
          cb(null, dojo);
        });
      }], done);
  }

  function cmd_update(args, done){
    var dojo = args.dojo;

    if(dojo.country){
      dojo.countryName = dojo.country.countryName;
    }

    //load dojo before saving to get it's current state
    var dojoEnt = seneca.make$(ENTITY_NS);
    var dojoLeadsEnt = seneca.make$(DOJO_LEADS_ENTITY_NS);

    async.waterfall([
      function (done) {
        dojoEnt.load$(dojo.id, done);
      },
      /**
       * set 'Verfication' related stuff when verified changed, as follows:
       * - if verified changed to true, set verifiedAt and verifiedBy
       *      * when verified === 1 and if the dojo has no email set, create a new
       *        CD Organization(@coderdojo.com) email address for it
       * - if verified changed to false, clear verifiedAt and verifiedBy
      */
      function (currentDojoState, done) {
        if (!_.isNull(dojo.verified) && !_.isUndefined(dojo.verified) &&
          dojo.verified === 1) {

          dojo.verifiedAt = new Date();
          dojo.verifiedBy = args.user.id;


          dojoLeadsEnt.load$(dojo.dojoLeadId, function(err, dojoLead) {
            if (err) {
              return done(err)
            }

            dojoLead = dojoLead.data$();
            dojoLead.completed = true;
            dojoLead.currentStep = 5;  // salesforce trigger to set the Dojo Listing Verified...

            //update dojoLead
            seneca.act({role: plugin, cmd: 'save_dojo_lead', dojoLead: dojoLead}, function (err, dojoLead) {

              if (err) {
                return done(err)
              }

              //create CD Organization(@coderdojo.com) email address for the dojo if the dojo has no email already set
              if (_.isEmpty(dojo.email) || _.isNull(dojo.email) || _.isUndefined(dojo.email) &&
                _.isEmpty(currentDojoState.email) || _.isNull(currentDojoState.email) || _.isUndefined(currentDojoState.email)) {

                seneca.act({role: plugin, cmd: 'create_dojo_email', dojo: dojo}, function (err, organizationEmail) {
                  if (err) {
                    return done(err)
                  }

                  if (organizationEmail) {
                    dojo.email = organizationEmail.primaryEmail;
                  }
                  done(null, dojo);
                })
              } else done(null, dojo);
            });
          });
        } else if(!_.isNull(dojo.verified) && !_.isUndefined(dojo.verified) && dojo.verified === 0){
          dojo.verifiedAt = null;
          dojo.verifiedBy = null;

          dojoLeadsEnt.load$(dojo.dojoLeadId, function(err, dojoLead) {
            if (err) {
              return done(err)
            }
            dojoLead = dojoLead.data$();
            dojoLead.completed = false;
            dojoLead.currentStep = 4;  // reset state in salesforce

            //update dojoLead
            seneca.act({role: plugin, cmd: 'save_dojo_lead', dojoLead: dojoLead}, function (err, dojoLead) {
              if (err) {
                return done(err)
              }

              done(null, dojo);
            });
          });
        } else done(null, dojo);

      },
      function (dojo, done) {
        seneca.make$(ENTITY_NS).save$(dojo, function (err, response) {
          if (err) return done(err);
          done(null, response);
        });
      }
    ], function (err, res) {
      if (err) return done(err);
      done(null, res);
    });
  }

  function checkUserDojoPermissions(dojoId, user, cb) {
    // first check user is an admin
    if (_.contains(user.roles, CDF_ADMIN)) {
      return cb();
    }

    // check user is a member of this dojo
    seneca.act({role:plugin, cmd:'load_usersdojos', query:{userId: user.id, dojoId: dojoId}}, function (err, response) {
      if(err) return done(err);
      if(_.isEmpty(response)) {
        return cb('User is not a member of this Dojo');
      } else {
        // TODO - need to check user_permissions field for the dojo-admin permission
        return cb();
      }
    });
  }

  function checkDojoExists(dojoId, cb) {
    seneca.make$(ENTITY_NS).load$(dojoId, function(err, ent) {
      if(err) return cb(err);
      return cb(null, ent !== null);
    });
  }

  function wrapCheckCDFAdmin(f) {
    return function(args, done) {
      var user = args.user;
      if (!_.contains(user.roles, CDF_ADMIN)) {
        return done(null, {ok:false, why: 'You must be a CDF Admin user'});
      }
      return f(args, done);
    };
  };

  function wrapDojoExists(f) {
    return function(args, done) {
      checkDojoExists(args.id, function(err, exists) {
        if (err) return done(err);
        if (!exists) return done(null, {ok: false, why: 'Dojo does not exist: ' + args.id, code: 404});
        return f(args, done);
      });
    }
  }

  function wrapDojoPermissions(f) {
    return function(args, done) {
      checkUserDojoPermissions(args.id, args.user, function(err) {
        if (err) return done(null, {ok: false, why: err, code: 403});
        return f(args, done);
      });
    }
  }

  function cmd_delete(args, done){
    // TODO - there must be other data to remove if we delete a dojo??
    var user = args.user;
    var query = {userId:user.id, dojoId:args.id};

    async.waterfall([
      async.apply(isUserChampionAndDojoAdmin, query, user),
      deleteDojo
    ], done);

    function deleteDojo(hasPermission, cb) {
      if(hasPermission) {
        seneca.make$(ENTITY_NS).remove$(args.id, function(err){
          if(err) return done(err);
          seneca.make$(USER_DOJO_ENTITY_NS).remove$({dojo_id: args.id}, cb);
        });
      } else {
        var err = new Error('cmd_delete/permission-error');
        err.critical = false;
        err.httpstatus = 403;
        cb(err);
      }
    }
  }

  function cmd_bulk_update(args, done){
    async.each(args.dojos, function(dojo, cb) {
      seneca.act({role: plugin, cmd: 'update', dojo: dojo, user: args.user}, cb);
    }, done);
  }

  function cmd_bulk_delete(args, done){
    async.map(args.dojos, function deleteDojo(dojo, cb) {
      seneca.act({role: plugin, cmd: 'delete', id: dojo.id, user: args.user}, cb);
    }, done);
  }

  function cmd_my_dojos(args, done){
    async.waterfall([
      function(done) {
        seneca.make$(USER_DOJO_ENTITY_NS).list$({user_id: args.user.id, limit$: 'NULL'}, done);
      },
      function(userDojos, done) {
        if (!userDojos || !userDojos.length) {
          return done(null ,[], []);
        }

        var dojoIds = _.pluck(userDojos, 'dojoId');
        var query = {ids:dojoIds};

        var search = args.search;
        if (search && search.from){
          query.skip$ = search.from;
        }
        if (search && search.size){
          query.limit$ = search.size;
        }
        if (search && search.sort){
          query.sort$ = search.sort;
        }
        seneca.make$(ENTITY_NS).list$(query, _.partialRight(done, userDojos));
      },
      function(dojos, userDojos, done) {
        return done(null, {
          total: userDojos.length,
          records: dojos
        });
      }
    ], done);
  }

  function cmd_get_stats(args, done){
    seneca.make$(STATS_ENTITY_NS).list$({limit$: 'NULL'}, function(err, dojos){
      if(err){
        return done(err);
      }

      var dojoMappedByContinent = {};

      _.forEach(dojos, function(dojo){
        if(!dojoMappedByContinent[dojo.continent]){
          dojoMappedByContinent[dojo.continent] = [];
        }

        dojoMappedByContinent[dojo.continent].push(dojo);
      });

      done(null, dojoMappedByContinent);
    });
  }

  function updateSalesForceChampionDetails(userId, dojoLead) {
     var account = {
      PlatformId__c: userId,
     };
    if (dojoLead.application.championDetails.email)
      account.Email = dojoLead.application.championDetails.email;
    if (dojoLead.application.championDetails.phone)
      account.Phone = dojoLead.application.championDetails.phone;

    if (dojoLead.application.championDetails.placeName)
      account.Street = dojoLead.application.championDetails.placeName;
    if (dojoLead.application.championDetails.countryName)
      account.Country = dojoLead.application.championDetails.countryName;

    if (dojoLead.application.championDetails.dateOfBirth)
      account.DateofBirth__c = dojoLead.application.championDetails.dateOfBirth;
    if (dojoLead.application.championDetails.twitter)
      account.Twitter__c = dojoLead.application.championDetails.twitter;
    if (dojoLead.application.championDetails.linkedIn)
      account.Linkedin__c = dojoLead.application.championDetails.linkedIn;

    seneca.act('role:cd-salesforce,cmd:save_account', {userId: userId, account: account}, function (err, res){
      if (err) return seneca.log.error('Error saving champion account in SalesForce!', err);
      seneca.log.info('Account saved in SalesForce', account, res);
    });
  }

  // Note at this stage we expect to have an existing Account and Lead types in salesforce, this is
  // done at inital champion registration in cp-users.
  function updateSalesForce(userId, dojoLead) {
    var lead = {
      PlatformId__c: userId,
    };

    if (dojoLead.application && dojoLead.application.championDetails) {
      updateSalesForceChampionDetails(userId, dojoLead);
      if (dojoLead.application.championDetails.name)
        lead.LastName = dojoLead.application.championDetails.name;
    }

    if (dojoLead.name) lead.Name = dojoLead.name;
    if (dojoLead.application && dojoLead.application.dojoListing && dojoLead.application.dojoListing.name) {
      lead.Company = dojoLead.application.dojoListing.name;
      lead.Name = dojoLead.application.dojoListing.name;
    }

    if (dojoLead.email) lead.Email = dojoLead.email;
    if (dojoLead.phone) lead.Phone = dojoLead.phone;
    if (dojoLead.twitter) lead.Twitter__c = dojoLead.twitter;
    if (dojoLead.website) lead.Website = dojoLead.website;
    if (dojoLead.address1) lead.Street = dojoLead.address1;
    if (dojoLead.countryName) lead.Country = dojoLead.countryName;

    var convertAccount = false;
    switch(dojoLead.currentStep) {
      case 2:
        lead.Status = '2. Champion Registration Completed';
        break;
      case 3:
        lead.Status = '4. Dojo Set Up Completed';
        break;
      case 4:
        lead.Status = '5. Dojo Listing Created';
        break;
      case 5:
        lead.Status = '7. Dojo Listing Verified';
        convertAccount = true;
        break;
    };

    seneca.act('role:cd-salesforce,cmd:save_lead', {userId: userId, lead: lead}, function (err, res){
      if (err) return seneca.log.error('Error saving Lead in SalesForce!', err);
      seneca.log.info('Lead saved in SalesForce', lead, res);
      if (convertAccount === true) {
        seneca.act('role:cd-salesforce,cmd:convert_lead_to_account', {leadId: res.id$}, function (err, res){
          if (err) return seneca.log.error('Error converting Lead to Account in SalesForce!', err);
          seneca.log.info('Lead converted to Account in SalesForce', lead, res);
        });
      }
    });
  }

  function cmd_save_dojo_lead(args, done) {
    var dojoLeadEntity = seneca.make$(DOJO_LEADS_ENTITY_NS);
    var dojoLead = args.dojoLead;
    dojoLeadEntity.save$(dojoLead, function(err, response) {
      if(err) return done(err);
      if(process.env.SALESFORCE_ENABLED === 'true') {
        // Note: updating SalesForce is slow, ideally this would go on a work queue
        process.nextTick(function() { updateSalesForce(dojoLead.userId, dojoLead); });
      };
      done(null, response);
    });
  }

  /**
   * Returns the uncompleted dojo lead for a certain user.
   * There should be only one uncompleted dojo lead at a moment.
   */
  function cmd_load_user_dojo_lead(args, done) {
    var dojoLeadEntity = seneca.make$(DOJO_LEADS_ENTITY_NS);

    var query = {
      userId: args.id,
      completed: false
    };

    dojoLeadEntity.load$(query, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_load_dojo_lead(args, done) {
    var dojoLeadEntity = seneca.make$(DOJO_LEADS_ENTITY_NS);

    //TO-DO: use seneca-perm to restrict this action to cdf-admin users.
    dojoLeadEntity.load$(args.id, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }


  function cmd_load_setup_dojo_steps(args, done) {
    done(null, setupDojoSteps);
  }

  function cmd_load_users_dojos(args, done){
    var usersdojos_ent;
    var query = args.query ? args.query : {};

    usersdojos_ent = seneca.make$(USER_DOJO_ENTITY_NS);

    usersdojos_ent.list$(query, function(err, usersDojos){
      if(err){
        return done(err);
      }
      done(null, usersDojos);
    });
  }

  function cmd_load_dojo_users(args, done) {
    var query  = args.query;

    seneca.act({role:plugin, cmd:'load_usersdojos', query: query}, function (err, response) {
      if(err) return done(err);
      var userIds = _.pluck(response, 'userId');
      seneca.act({role:'cd-users', cmd:'list', ids:userIds}, done);
    });
  }

  function cmd_send_email(args, done) {
    var payload = args.payload;
    var to = payload.to;
    var content = payload.content;
    var emailCode = payload.code;
    seneca.act({role:'email-notifications', cmd: 'send', to:to, content:content, code:emailCode}, done);
  }

  function cmd_generate_user_invite_token(args, done) {
    var zenHostname = args.zenHostname;
    var inviteEmail = args.email;
    var dojoId = args.dojoId;
    var userType = args.userType;
    var inviteToken = shortid.generate();
    var currentUser = args.user;
    if(!userType) userType = DEFAULT_INVITE_USER_TYPE;

    async.waterfall([
      getDojo,
      generateInviteToken,
      sendEmail
    ], done);

    function getDojo(done) {
      seneca.act({role:plugin, cmd:'load', id:dojoId}, done);
    }

    function generateInviteToken(dojo, done) {
      var timestamp = new Date();
      var userInvite = {id:inviteToken, email:inviteEmail, userType:userType, timestamp:timestamp};
      if(!dojo.userInvites) dojo.userInvites = [];
      dojo.userInvites.push(userInvite);
      dojo.userInvites = _.sortBy(dojo.userInvites, function(userInvite) { return userInvite.timestamp; });
      dojo.userInvites.reverse();
      dojo.userInvites = _.uniq(dojo.userInvites, function(userInvite) { return userInvite.email; });

      seneca.act({role:plugin, cmd:'update', user:currentUser, dojo:dojo}, done);
    }

    function sendEmail(dojo, done) {
      var content = {
        link: 'http://'+zenHostname+'/accept_dojo_user_invitation/'+dojo.id+'/'+inviteToken,
        userType:userType,
        dojoName:dojo.name,
        year: moment(new Date()).format('YYYY')
      };
      var payload = {to:inviteEmail, code:'invite-user', content:content};
      seneca.act({role:plugin, cmd:'send_email', payload:payload}, done);
    }
  }

  function cmd_accept_user_invite(args, done) {
    var data = args.data;
    var dojoId = data.dojoId;
    var inviteToken = data.inviteToken;
    var currentUserEmail = data.currentUserEmail;
    var currentUserId = data.currentUserId;
    var requestSuccessStatus = 0;

    seneca.act({role:plugin, cmd:'load'}, {id:dojoId}, function(err, response) {
      if(err) return done(err);
      var dojo = response;
      var userInvites = dojo.userInvites;
      var userInviteToken;

      var inviteFound = _.find(userInvites, function(userInvite) {
        if(userInvite.id === inviteToken && userInvite.email === currentUserEmail) {
          return userInviteToken = userInvite;
        }
      });

      if(inviteFound) {
        if(err) return done(err);
        requestSuccessStatus = 1;
        var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
        //Add user to dojo users if not already added.
        seneca.act({role:plugin, cmd:'load_usersdojos', query:{userId:currentUserId, dojoId:dojoId}}, function (err, response) {
          if(err) return done(err);
          if(_.isEmpty(response)) {
            var userDojo = {};
            userDojo.owner = 0;
            userDojo.user_id = currentUserId;
            userDojo.dojo_id = dojoId;
            userDojo.userTypes = [];
            userDojo.userTypes.push(userInviteToken.userType);
            //If invite token user type is champion, update user permissions
            if(userInviteToken.userType === 'champion') {
              userDojo.userPermissions = [
                {title:'Dojo Admin', name:'dojo-admin'},
                {title:'Forum Admin', name:'forum-admin'}, 
                {title:'Ticketing Admin', name:'ticketing-admin'}
              ]; 
            }
            usersDojosEntity.save$(userDojo, function (err, response) {
              if(err) return done(err);
              done(null, {status:requestSuccessStatus});
            });
          } else {
            //userDojo entity already exists.
            //Update the userTypes array.
            var userDojo = response[0];
            if(!userDojo.userTypes) userDojo.userTypes = [];
            userDojo.userTypes.push(userInviteToken.userType);
            //If invite token user type is champion, update user permissions
            if(userInviteToken.userType === 'champion') {
              userDojo.userPermissions = [
                {title:'Dojo Admin', name:'dojo-admin'},
                {title:'Forum Admin', name:'forum-admin'}, 
                {title:'Ticketing Admin', name:'ticketing-admin'}
              ];
            }
            usersDojosEntity.save$(userDojo, function (err, response) {
              if(err) return done(err);
              done(null, {status:requestSuccessStatus});
            });
          }
        });
      } else {
        done(null, {status:requestSuccessStatus});
      }
    });
  }

  function cmd_request_user_invite(args, done) {
    var inviteToken = shortid.generate();
    var zenHostname = args.zenHostname;
    var data = args.data;
    var user = data.user;
    var userType = data.userType;
    var dojoId = data.dojoId;
    if(!userType) userType = DEFAULT_INVITE_USER_TYPE;

    async.waterfall([
      getDojo,
      getDojoChampion,
      generateInviteToken,
      sendEmail
    ], done);

    function getDojo (done) {
      seneca.act({role:plugin, cmd:'load', id:dojoId}, done);
    }

    function getDojoChampion (dojo, done) {
      seneca.act({role:plugin,cmd:'load_dojo_champion', id:dojoId}, function (err, response) {
        if(err) return done(err);
        //TO-DO: currently we just use the first champion returned from the load_dojo_champion action.
        //Further checking should be done to pick a specific champion of this dojo.
        //e.g Use the first champion of this Dojo.
        if(response) var champion = response[0];
        done(null, champion, dojo);
      });
    }

    function generateInviteToken (champion, dojo, done) {
      if(!champion) return done(null, champion, dojo);
      var timestamp = new Date();
      var joinRequest = {id:inviteToken, dojoId:dojoId, championId:champion.id, userType:userType, timestamp:timestamp};
      if(!user.joinRequests) user.joinRequests = [];
      user.joinRequests.push(joinRequest);
      user.joinRequests = _.chain(user.joinRequests)
      .sortBy(function(joinRequest) { return joinRequest.timestamp; })
      .reverse()
      .uniq(true, function(joinRequest) { return joinRequest.dojoId; });

      seneca.act({role:'cd-users', cmd:'update', user:user}, function (err, response) {
        if(err) return done(err);
        done(null, champion, dojo);
      });
    }

    function sendEmail (champion, dojo, done) {
      if(!champion) return done();
      var championEmail = champion.email;
      var content = {
        link:'http://'+zenHostname+'/accept_dojo_user_request/'+user.id+'/'+inviteToken,
        name:user.name,
        email:user.email,
        dojoName:dojo.name,
        userType:userType,
        year: moment(new Date()).format('YYYY')
      };
      var code = 'user-request-to-join';
      var payload = {to:championEmail, code:code, content:content};
      seneca.act({role:plugin, cmd:'send_email', payload:payload}, done);
    }

  }

  function cmd_load_dojo_champion(args, done) {
    var dojoId = args.id;
    var query  = {dojoId:dojoId};
    var champions;
    seneca.act({role:plugin, cmd:'load_dojo_users', query: query}, function (err, response) {
      if(err) return done(err);
      //Check cd/usersdojos for the champion user type
      var champions = [];
      async.each(response, function (user, cb) {
        var query = {userId:user.id, dojoId:dojoId};
        seneca.act({role:plugin, cmd:'load_usersdojos', query: query}, function (err, response) {
          if(err) return cb(err);
          var userDojo = response[0];
          if(!userDojo) return cb();
          if(_.contains(userDojo.userTypes, 'champion')) champions.push(user);
          cb();
        });
      }, function () {
        done(null, champions);
      })
    });
  }

  function cmd_accept_user_request(args, done) {
    var tokenData = args.data;
    var currentUserId = tokenData.currentUserId;
    var currentUserEmail = tokenData.currentUserEmail;
    var inviteTokenId = tokenData.inviteToken;
    var requestedByUser = tokenData.requestedByUser;
    var dojoId;
    var requestSuccessStatus = 0;
    var joinRequest;

    async.waterfall([
      loadUser,
      verifyRequest,
      updateUser
    ], function (err) {
      if(err) return done(err);
      done(null, {status:requestSuccessStatus});
    });

    function loadUser(done) {
      seneca.act({role:'cd-users', cmd:'load', id:requestedByUser}, function (err, response) {
        if(err) return done(err);
        var user = response;
        var joinRequests = user.joinRequests;
        var validRequestFound = _.findWhere(joinRequests, {id:inviteTokenId, championId:currentUserId});
        done(null, validRequestFound);
      });
    }

    function verifyRequest(validRequestFound, done) {
      var championFound;
      if(validRequestFound) {
        //Check if the current user is a champion of this dojo.
        joinRequest = validRequestFound;
        dojoId = joinRequest.dojoId;
        seneca.act({role:plugin, cmd:'load_dojo_champion', id:dojoId}, function (err, response) {
          if(err) return done(err);
          var dojoChampions = response;
          championFound = _.find(dojoChampions, function (dojoChampion) {
            if(dojoChampion.id === currentUserId) return dojoChampion;
          });
          done(null, championFound);
        });
      } else {
        done(null, championFound);
      }
    }

    function updateUser(championFound, done) {
      if(championFound) {
        //Add type to userTypes in cd/usersdojos.
        requestSuccessStatus = 1;
        var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
        //Add user to dojo users if not already added.
        seneca.act({role:plugin, cmd:'load_usersdojos', query:{userId:requestedByUser, dojoId:dojoId}}, function (err, response) {
          if(err) return done(err);
          if(_.isEmpty(response)) {
            var userDojo = {};
            userDojo.owner = 0;
            userDojo.user_id = requestedByUser;
            userDojo.dojo_id = dojoId;
            userDojo.userTypes = [];
            userDojo.userTypes.push(joinRequest.userType);
            usersDojosEntity.save$(userDojo, function (err, response) {
              if(err) return done(err);
              tidyUpJoinRequests(done);
            });
          } else {
            //Update cd/usersdojos
            var userDojo = response[0];
            if(!userDojo.userTypes) userDojo.userTypes = [];
            userDojo.userTypes.push(joinRequest.userType);
            usersDojosEntity.save$(userDojo, function (err, response) {
              tidyUpJoinRequests(done);
            });
          }
        });
      } else {
        done();
      }
    }

    function tidyUpJoinRequests(done) {
      seneca.act({role:'cd-users', cmd:'load', id:requestedByUser}, function (err, response) {
        if(err) return done(err);
        var user = response;
        var joinRequests = user.joinRequests;
        var joinRequestToDelete = _.find(joinRequests, function(joinRequest) {
          if(joinRequest.id === inviteTokenId) return joinRequest;
        });
        var joinRequestToDelete = joinRequests.indexOf(joinRequestToDelete);
        user.joinRequests.splice(joinRequestToDelete, 1);
        seneca.act({role:'cd-users', cmd:'update', user:user}, done);
      });
    }
  }

  function cmd_dojos_for_user(args, done) {
    var userId = args.id;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
    var dojosEntity = seneca.make$(ENTITY_NS);
    var query = {userId:userId};
    var dojos = [];
    seneca.act({role:plugin, cmd:'load_usersdojos', query:query}, function (err, response) {
      if(err) return done(err);
      async.each(response, function (userDojoLink, cb) {
        seneca.act({role:plugin, cmd:'load', id:userDojoLink.dojoId}, function (err, response) {
          if(err) return cb(err);
          dojos.push(response);
          cb();
        });
      }, function (err) {
        if(err) return  done(err);
        done(null, dojos);
      });
    });
  }

  function cmd_save_usersdojos(args, done) {
    //TODO: Add permissions check.
    var userDojo = args.userDojo;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);

    if(userDojo.userPermissions) {
      userDojo.userPermissions = _.uniq(userDojo.userPermissions, function(userPermission) { return userPermission.name; });
    }
    usersDojosEntity.save$(userDojo, done);
     
  }

  function cmd_remove_usersdojos(args, done) {
    //TODO: Add permissions check.
    var userId = args.userId;
    var dojoId = args.dojoId;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);

    async.waterfall([
      removeUserDojoLink,
      loadUserAndDojoDetails,
      loadDojoChampion,
      emailDojoChampion
    ], done);

    function removeUserDojoLink(cb) {
      usersDojosEntity.remove$({userId:userId, dojoId:dojoId}, cb);
    }

    function loadUserAndDojoDetails(userDojo, cb) {
      var user;
      var dojo;

      async.waterfall([
        loadUser,
        loadDojo
      ], function (err) {
        if(err) return cb(err);
        cb(null, user, dojo);
      });

      function loadUser(cb) {
        seneca.act({role:'cd-users', cmd:'load', id:userId}, function (err, response) {
          if(err) return cb(err);
          user = response;
          cb();
        });
      }

      function loadDojo(cb) {
        seneca.act({role:plugin, cmd:'load', id:dojoId}, function (err, response) {
          if(err) return cb(err);
          dojo = response;
          cb();
        });
      }
       
    }

    function loadDojoChampion(user, dojo, cb) {
      seneca.act({role:plugin, cmd:'load_dojo_champion', id:dojo.id}, function (err, response) {
        if(err) return cb(err);
        var champion = response[0];
        cb(null, user, dojo, champion);
      });
    }

    function emailDojoChampion(user, dojo, champion, cb) {
      if(!champion) return cb(); 
      var content = {
        name:user.name,
        email:user.email,
        dojoName:dojo.name,
        year: moment(new Date()).format('YYYY')
      };
      var payload = {to:champion.email, code:'user-left-dojo', content:content};
      seneca.act({role:plugin, cmd:'send_email', payload:payload}, cb);
    }
  }

  function cmd_get_user_types(args, done) {
    var userTypes = ['attendee-o13', 'parent-guardian' , 'mentor', 'champion'];
    done(null, userTypes);
  }

  function cmd_get_user_permissions(args, done) {
    var userPermissions = [
      {title:'Dojo Admin', name:'dojo-admin'},
      {title:'Ticketing Admin',name:'ticketing-admin'},
      {title:'Forum Admin', name:'forum-admin'}
    ];
    done(null, userPermissions);
  }

  return {
    name: plugin
  };

};