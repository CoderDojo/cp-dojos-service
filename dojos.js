'use strict';

var util = require('util');
var _ = require('lodash');
var async = require('async');
var slug = require('slug');
var shortid = require('shortid');
var crypto = require('crypto');
var randomstring = require('randomstring');
var fs = require('fs');

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
  seneca.add({role: plugin, cmd: 'generate_mentor_invite_token'}, cmd_generate_mentor_invite_token);
  seneca.add({role: plugin, cmd: 'accept_mentor_invite'}, cmd_accept_mentor_invite);
  seneca.add({role: plugin, cmd: 'request_mentor_invite'}, cmd_request_mentor_invite);
  seneca.add({role: plugin, cmd: 'load_dojo_champion'}, cmd_load_dojo_champion);
  seneca.add({role: plugin, cmd: 'accept_mentor_request'}, cmd_accept_mentor_request);
  seneca.add({role: plugin, cmd: 'dojos_for_user'}, cmd_dojos_for_user);
  seneca.add({role: plugin, cmd: 'save_usersdojos'}, cmd_save_usersdojos);
  seneca.add({role: plugin, cmd: 'remove_usersdojos'}, cmd_remove_usersdojos);
  seneca.add({role: plugin, cmd: 'get_user_types'}, cmd_get_user_types);
  seneca.add({role: plugin, cmd: 'get_user_permissions'}, cmd_get_user_permissions);
  seneca.add({role: plugin, cmd: 'create_dojo_email'}, cmd_create_dojo_email);

  function cmd_create_dojo_email(args, done){
    if(!args.dojo){
      return done('Dojo data is missing.');
    }

    if(process.env.ENVIRONMENT === 'development'){
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
      if (err) { throw err; }

      // Insert user
      admin.users.insert({
        resource: getGoogleUserData(args.dojo),
        auth: jwt
      }, function (err, data) {
        done(null, data);
      });
    });
  }

  function getGoogleUserData(dojo){
    var userData = {};

    //this can look something like this: nsc-mahon-cork.ie@coderdojo.com
    var primaryEmail = _.last(dojo.urlSlug.split('/')).concat('.', dojo.alpha2.toLowerCase(), '@coderdojo.com');

    //required user data
    userData.name = {
      familyName: dojo.name, //this can be changed with the champion name & family name
      givenName: dojo.place
    };
    var pass = randomstring.generate(8);
    userData.password = sha1sum('cocacola');//use default pass for now; replace this with random pass when finished
    userData.hashFunction = "SHA-1";
    userData.primaryEmail = primaryEmail;
    userData.changePasswordAtNextLogin = true;

    //TODO: determine what other optional attributes are required and add them
    //emails and organizations can also be altered
    userData.emails= [
      {
        "address": "cristian.kiss@nearform.com",
        "type": "other",
        "customType": "",
        "primary": false
      }
    ];
    userData.organizations= [
      {
        "name": "nearform_test",
        "title": "champion",
        "primary": true,
        "type": "school",
        "description": "new test dojo",
        domain: 'coderdojo.org'
      }
    ];

    return userData;
  }

  function sha1sum(input){
    return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex')
  }

  function cmd_search(args, done) {
    var usersdojos_ent = seneca.make$(USER_DOJO_ENTITY_NS);
    async.waterfall([
      function(done) {
        seneca.act('role:cd-dojos-elasticsearch,cmd:search', {search:args.search}, done);
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
        if(dojo.coordinates && dojo.deleted !== 1 && dojo.verified !== 0 && dojo.stage === 2) {
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
          if(dojo.deleted === 1 || dojo.verified === 0 || dojo.stage !== 2) return cb();
          dojos.push(dojo);
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
        if(dojo.deleted !== 1 && dojo.verified !== 0 && dojo.stage === 2) {
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

    if(dojo.needMentors) {
      dojo.needMentors = 1;
    } else {
      dojo.needMentors = 0;
    }

    var slugify = function(name) {
      return slug(name);
    };

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
        userDojo.user_id = user.id;
        userDojo.dojo_id = dojo.id;
        usersDojosEntity.save$(userDojo, cb);
      }], done);
  }

  function cmd_update(args, done){
    var dojo = args.dojo;

    if(dojo.country){
      dojo.countryName = dojo.country.countryName;
    }

    //load dojo before saving to get it's current state
    var dojoEnt = seneca.make$(ENTITY_NS);

    async.waterfall([
      function (done) {
        dojoEnt.load$(dojo.id, function(err, result){
          if (err) { throw err; }
          done();
        });
      },
      /**
       * set 'Verfication' related stuff when verified changed, as follows:
       * - if verified changed to true, set verifiedAt and verifiedBy
       *      * when verified === 1 and if the dojo has no email set, create a new
       *        CD Organization(@coderdojo.com) email address for it
       * - if verified changed to false, clear verifiedAt and verifiedBy
      */
      function (currentDojoState, done) {
        console.log('DOOOOODOOODODODOODjooo', JSON.stringify(dojo));
        if (!_.isNull(dojo.verified) && !_.isUndefined(dojo.verified) &&
          dojo.verified === 1) {

          dojo.verifiedAt = new Date();
          dojo.verifiedBy = args.user.id;

          //create CD Organization(@coderdojo.com) email address for the dojo if the dojo has no email already set
          if (_.isEmpty(dojo.email) || _.isNull(dojo.email) || _.isUndefined(dojo.email) &&
            _.isEmpty(currentDojoState.email) || _.isNull(currentDojoState.email) || _.isUndefined(currentDojoState.email)) {

            seneca.act({role: plugin, cmd: 'create_dojo_email', dojo: dojo}, function (err, organizationEmail) {
              if (err) { return done(err) }

              if (organizationEmail) {
                dojo.email = organizationEmail.primaryEmail;
              }
              done();
            })
          }
        } else if(!_.isNull(dojo.verified) && !_.isUndefined(dojo.verified) &&
          dojo.verified === 0){
          dojo.verifiedAt = null;
          dojo.verifiedBy = null;

          done();
        } else
          done();

      },
      function (done) {
        seneca.make$(ENTITY_NS).save$(dojo, function (err, response) {
          if (err) return done(err);
          done(null, response);
        });
      }
    ], function (err) {
      if (err) return done(err);
      done(null);
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
    seneca.make$(ENTITY_NS).remove$(args.id, function(err){
      if(err) return done(err);
      seneca.make$(USER_DOJO_ENTITY_NS).remove$({dojo_id: args.id}, done);
    });
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
        if (search.from){
          query.skip$ = search.from;
        }
        if (search.size){
          query.limit$ = search.size;
        }
        if (search.sort){
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

  function updateSalesForce(userId, dojoLead) {
    var lead = {
      PlatformId__c: userId,
      // TODO - need to link to users profile in the platform here when it's ready
      PlatformUrl__c: 'https://zen.coderdojo.com/TODO-users/' + userId
    };

    if (dojoLead.application && dojoLead.application.championDetails && dojoLead.application.championDetails.name)
      lead.LastName = dojoLead.application.championDetails.name;
    if (dojoLead.application && dojoLead.application.dojoListing && dojoLead.application.dojoListing.name)
      lead.Company = dojoLead.application.dojoListing.name;
    if (dojoLead.email) lead.Email = dojoLead.email;
    if (dojoLead.phone) lead.Phone = dojoLead.phone;

    seneca.act('role:cd-salesforce,cmd:save_lead', {userId: userId, lead: lead}, function (err, res){
      if (err) return seneca.log.error('Error creating lead in SalesForce!', err);
      seneca.log.info('Created lead in SalesForce', lead, res);
    });
  }

  function cmd_save_dojo_lead(args, done) {
    var dojoLeadEntity = seneca.make$(DOJO_LEADS_ENTITY_NS);
    var dojoLead = args.dojoLead;

    dojoLeadEntity.save$(dojoLead, function(err, response) {
      if(err) return done(err);
      if(process.env.SALESFORCE_ENABLED === true || process.env.SALESFORCE_ENABLED === 'true') {
        // Note: updating SalesForce is slow, ideally this would go on a work queue
        process.nextTick(function() { updateSalesForce(args.user.id, dojoLead); });
      };
      done(null, response);
    });
  }

  function cmd_load_user_dojo_lead(args, done) {
    var dojoLeadEntity = seneca.make$(DOJO_LEADS_ENTITY_NS);
    var userId = args.id;

    dojoLeadEntity.load$({userId:userId}, function(err, response) {
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

  function cmd_generate_mentor_invite_token(args, done) {
    var inviteEmail = args.email;
    var dojoId = args.dojoId;
    var inviteToken = shortid.generate();

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
      var mentorInvite = {id:inviteToken, email:inviteEmail, timestamp:timestamp};
      if(!dojo.mentorInvites) dojo.mentorInvites = [];
      dojo.mentorInvites.push(mentorInvite);
      dojo.mentorInvites = _.sortBy(dojo.mentorInvites, function(mentorInvite) { return mentorInvite.timestamp; });
      dojo.mentorInvites.reverse();
      dojo.mentorInvites = _.uniq(dojo.mentorInvites, function(mentorInvite) { return mentorInvite.email; });

      seneca.act({role:plugin, cmd:'update', dojo:dojo}, done);
    }

    function sendEmail(dojo, done) {
      var payload = {to:inviteEmail, code:'invite-mentor', content:{link:'http://localhost:8000/accept_dojo_mentor_invitation/'+dojo.id+'/'+inviteToken}};
      seneca.act({role:plugin, cmd:'send_email', payload:payload}, done);
    }
  }

  function cmd_accept_mentor_invite(args, done) {
    var data = args.data;
    var dojoId = data.dojoId;
    var inviteToken = data.inviteToken;
    var currentUserEmail = data.currentUserEmail;
    var currentUserId = data.currentUserId;
    var requestSuccessStatus = 0;

    seneca.act({role:plugin, cmd:'load'}, {id:dojoId}, function(err, response) {
      if(err) return done(err);
      var dojo = response;
      var mentorInvites = dojo.mentorInvites;

      var inviteFound = _.find(mentorInvites, function(mentorInvite) {
        if(mentorInvite.id === inviteToken && mentorInvite.email === currentUserEmail) {
          return mentorInvite;
        }
      });

      if(inviteFound) {
        seneca.act({role:'cd-users', cmd:'promote', id:currentUserId, roles:['mentor']}, function(err, response) {
          if(err) return done(err);
          requestSuccessStatus = 1;
          //Add user to dojo users if not already added.
          seneca.act({role:plugin, cmd:'load_usersdojos', query:{userId:currentUserId, dojoId:dojoId}}, function (err, response) {
            if(err) return done(err);
            if(_.isEmpty(response)) {
              var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
              var userDojo = {};
              userDojo.owner = 0;
              userDojo.user_id = currentUserId;
              userDojo.dojo_id = dojoId;
              usersDojosEntity.save$(userDojo, function (err, response) {
                if(err) return done(err);
                done(null, {status:requestSuccessStatus});
              });
            } else {
              done(null, {status:requestSuccessStatus});
            }
          });

        });
      } else {
        done(null, {status:requestSuccessStatus});
      }
    });
  }

  function cmd_request_mentor_invite(args, done) {
    var inviteToken = shortid.generate();
    var data = args.data;
    var user = data.user;
    var dojoId = data.dojoId;

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
      var mentorRequest = {id:inviteToken, dojoId:dojoId, championId:champion.id, timestamp:timestamp};
      if(!user.mentorRequests) user.mentorRequests = [];
      user.mentorRequests.push(mentorRequest);
      user.mentorRequests = _.chain(user.mentorRequests)
      .sortBy(function(mentorRequest) { return mentorRequest.timestamp; })
      .reverse()
      .uniq(true, function(mentorRequest) { return mentorRequest.dojoId; });

      seneca.act({role:'cd-users', cmd:'update', user:user}, function (err, response) {
        if(err) return done(err);
        done(null, champion, dojo);
      });
    }

    function sendEmail (champion, dojo, done) {
      if(!champion) return done();
      var championEmail = champion.email;
      var content = {
        link:'http://localhost:8000/accept_dojo_mentor_request/'+user.id+'/'+inviteToken,
        name:user.name,
        email:user.email,
        dojoName:dojo.name
      };
      var code = 'mentor-request-to-join';
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
      _.find(response, function (user) {
        if(_.contains(user.roles, 'champion')) {
          champions = [];
          champions.push(user);
        }
      });
      done(null, champions);
    });
  }

  function cmd_accept_mentor_request(args, done) {
    var tokenData = args.data;
    var currentUserId = tokenData.currentUserId;
    var currentUserEmail = tokenData.currentUserEmail;
    var inviteTokenId = tokenData.inviteToken;
    var requestedByUser = tokenData.requestedByUser;
    var dojoId;
    var requestSuccessStatus = 0;

    async.waterfall([
      loadUser,
      verifyMentorRequest,
      updateUser
    ], function (err) {
      if(err) return done(err);
      done(null, {status:requestSuccessStatus});
    });

    function loadUser(done) {
      seneca.act({role:'cd-users', cmd:'load', id:requestedByUser}, function (err, response) {
        if(err) return done(err);
        var user = response;
        var mentorRequests = user.mentorRequests;
        var validRequestFound = _.findWhere(mentorRequests, {id:inviteTokenId, championId:currentUserId});
        done(null, validRequestFound);
      });
    }

    function verifyMentorRequest(validRequestFound, done) {
      var championFound;
      if(validRequestFound) {
        //Check if the current user is a champion of this dojo.
        var mentorRequest = validRequestFound;
        dojoId = mentorRequest.dojoId;
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
        //Promote user to mentor role.
        seneca.act({role:'cd-users', cmd:'promote', id:requestedByUser, roles:['mentor']}, function (err, response) {
          if(err) return done(err);
          requestSuccessStatus = 1;
          //Add user to dojo users if not already added.
          seneca.act({role:plugin, cmd:'load_usersdojos', query:{userId:requestedByUser, dojoId:dojoId}}, function (err, response) {
            if(err) return done(err);
            if(_.isEmpty(response)) {
              var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
              var userDojo = {};
              userDojo.owner = 0;
              userDojo.user_id = requestedByUser;
              userDojo.dojo_id = dojoId;
              usersDojosEntity.save$(userDojo, done);
            } else {
              done();
            }
          });
        });
      } else {
        done();
      }
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
    var userDojo = args.userDojo;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);

    userDojo.userPermissions = _.uniq(userDojo.userPermissions, function(userPermission) { return userPermission.name; });
    usersDojosEntity.save$(userDojo, done);
  }

  function cmd_remove_usersdojos(args, done) {
    var userId = args.user.id;
    var dojoId = args.dojoId;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);

    usersDojosEntity.remove$({userId:userId, dojoId:dojoId}, done);
  }

  function cmd_get_user_types(args, done) {
    var userTypes = ['attendee-u13', 'attendee-o13', 'parent-guardian' , 'mentor', 'champion'];
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