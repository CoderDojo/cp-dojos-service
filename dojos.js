'use strict';

var _ = require('lodash');
var async = require('async');
var slug = require('slug');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-dojos';
  var ENTITY_NS = 'cd/dojos';
  var USER_DOJO_ENTITY_NS = "cd/usersdojos";
  var STATS_ENTITY_NS = "cd/stats";
  var DOJO_LEADS_ENTITY_NS = "cd/dojoleads";
  var setupDojoSteps = require('./data/setup_dojo_steps');

  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'find'}, cmd_find);
  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'delete'}, cmd_delete);
  seneca.add({role: plugin, cmd: 'my_dojos'}, cmd_my_dojos);
  seneca.add({role: plugin, cmd: 'dojos_count'}, cmd_dojos_count);
  seneca.add({role: plugin, cmd: 'dojos_by_country'}, cmd_dojos_by_country);
  seneca.add({role: plugin, cmd: 'dojos_state_count'}, cmd_dojos_state_count);
  seneca.add({role: plugin, cmd: 'bulk_update'}, cmd_bulk_update);
  seneca.add({role: plugin, cmd: 'bulk_delete'}, cmd_bulk_delete);
  seneca.add({role: plugin, cmd: 'get_stats'}, cmd_get_stats);
  seneca.add({role: plugin, cmd: 'save_dojo_lead'}, cmd_save_dojo_lead);
  seneca.add({role: plugin, cmd: 'load_user_dojo_lead'}, cmd_load_user_dojo_lead);
  seneca.add({role: plugin, cmd: 'load_dojo_lead'}, cmd_load_dojo_lead);
  seneca.add({role: plugin, cmd: 'load_setup_dojo_steps'}, cmd_load_setup_dojo_steps);
  seneca.add({role: plugin, cmd: 'load_usersdojos'}, cmd_load_users_dojos);


  function cmd_search(args, done) {
    var seneca = this;
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

              var userIds = _.pluck(userDojos, 'userId');

              seneca.act({role: 'cd-users', cmd: 'list', ids: userIds}, function(err, users){
                if(err){
                  return cb(err);
                }

                dojo.creatorEmails = _.pluck(users, 'email');
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
        var userIds = _.chain(searchResult.hits).pluck('_source').pluck('creator').uniq().value();
        async.waterfall([
          function(done) {
            seneca.act({role:'cd-agreements', cmd:'list', userIds: userIds}, done);
          },
          function(agreements, done) {
            agreements = _.indexBy(agreements, 'userId');
            _.each(_.pluck(searchResult.hits, '_source'), function(dojo) {
              if (dojo.creator && agreements[dojo.creator]) {
                dojo.agreements = agreements[dojo.creator].agreements;
              }
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
        debugger;
      }
      return done(err, res);
    });
  }

  function cmd_dojos_state_count(args, done) {
    var seneca = this;

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
    var seneca = this;

    async.waterfall([
      getDojos,
      getCountries,
      getDojoCount
    ], done);

    function getDojos(done) {
      var dojos = [];
      var query = {limit$:'NULL'};
      seneca.make(ENTITY_NS).list$(query, function(err, response) {
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
    var seneca = this, query = args.query || {};
    query.limit$ = 1500;
    seneca.make(ENTITY_NS).list$(query, function(err, response) {
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
    var seneca = this;
    seneca.make(ENTITY_NS).load$(args.id, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_find(args, done) {
    var seneca = this;
    seneca.make(ENTITY_NS).load$(args.query, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_create(args, done){
    var seneca = this, dojo = args.dojo, baseSlug;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);
    var createdby = args.user;
    var userDojo = {};

    dojo.creator = createdby;
    dojo.created = new Date();

    if(dojo.needMentors) {
      dojo.needMentors = 1;
    } else {
      dojo.needMentors = 0;
    }

    if(dojo.mailingList) {
      dojo.mailingList = 1;
    } else {
      dojo.mailingList = 0;
    }

    var slugify = function(name) {
      return slug(name);
    };

    baseSlug = _.chain([
      dojo.alpha2, dojo.admin1Name, dojo.placeName, dojo.name
    ]).compact().map(slugify).value().join('/').toLowerCase();

    async.waterfall([
      function(cb){
        seneca.make$(ENTITY_NS).list$({urlSlug: new RegExp('^' + baseSlug,  'i')},function(err, dojos){
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
        userDojo.user_id = createdby;
        userDojo.dojo_id = dojo.id;

        usersDojosEntity.save$(userDojo, cb);
      }], done);
  }

  function cmd_update(args, done){
    var seneca = this;
    var dojo = args.dojo;

    dojo.countryName = dojo.country;
    delete dojo.country;

    seneca.make(ENTITY_NS).save$(dojo, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_delete(args, done){
    var seneca = this;
    var id = args.id;
    var creatorId;

    seneca.make$(ENTITY_NS).load$(id, function(err, dojo){
      if(err){
        done(err);
      }

      creatorId = dojo.creator;

      seneca.make$(ENTITY_NS).remove$(id, function(err){
        if(err){
          return done(err);
        }

        seneca.make$(USER_DOJO_ENTITY_NS).load$({user_id: creatorId, dojo_id: id}, function(err, userDojo){
          if(err){
            return done(err);
          }
          if(userDojo && userDojo.id){
            seneca.make$(USER_DOJO_ENTITY_NS).remove$(userDojo.id, function(err){
              if(err){
                return done(err);
              }

              done();
            });
          }
          else {
            done();
          }

        });

      });
    });

  }

  function cmd_bulk_update(args, done){
    var seneca = this;
    async.each(args.dojos, function(dojo, done) {
      seneca.act({role: plugin, cmd: 'update', dojo: dojo}, done);
    }, done);
  }

  function cmd_bulk_delete(args, done){
    var seneca = this;
    async.each(args.dojos, function(dojo, done) {
      seneca.act({role: plugin, cmd: 'delete', id: dojo.id, creatorId: dojo.creator}, done);
    }, done);
  }

  function cmd_my_dojos(args, done){
    var seneca = this;

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
    var seneca = this;

    seneca.make(STATS_ENTITY_NS).list$({limit$: 'NULL'}, function(err, dojos){
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

  function cmd_save_dojo_lead(args, done) {
    var seneca = this;
    var dojoLeadEntity = seneca.make(DOJO_LEADS_ENTITY_NS);
    var dojoLead = args.dojoLead;

    dojoLeadEntity.save$(dojoLead, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });

  }

  function cmd_load_user_dojo_lead(args, done) {
    var seneca = this;
    var dojoLeadEntity = seneca.make(DOJO_LEADS_ENTITY_NS);
    var userId = args.id;

    dojoLeadEntity.load$({userId:userId}, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_load_dojo_lead(args, done) {
    var seneca = this;
    var dojoLeadEntity = seneca.make(DOJO_LEADS_ENTITY_NS);

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
    var usersdojos_ent, seneca = this;
    var query = args.query ? args.query : {};

    usersdojos_ent = seneca.make(USER_DOJO_ENTITY_NS);

    usersdojos_ent.list$(query, function(err, usersDojos){
      if(err){
        return done(err);
      }
      done(null, usersDojos);
    });
  }

  return {
    name: plugin
  };

};