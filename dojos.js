'use strict';

var _ = require('lodash');
var async = require('async');
var shortid = require('shortid');
var crypto = require('crypto');
var randomstring = require('randomstring');
var moment = require('moment');
var pg = require('pg');
var request = require('request').defaults({json: true});
var isoc = require('isoc');
var countries = require('./data/countries');
var continents = require('./data/continents');
var countriesList = require('countries-list');
var geocoder = require('node-geocoder')('google', 'https', {'apiKey': process.env.GOOGLE_MAPS_KEY});
var debug = require('debug')('dojos');
var google = require('googleapis');
var admin = google.admin('directory_v1');
var fs = require('fs');
//  Internal lib
//  TODO:70 globbing to avoid manual declaration ?
var addChildrenParentDojo = require('./lib/add-children-parent-dojo');
var cmd_export_dojo_users = require('./lib/export-csv');
var cmd_update_image = require('./lib/update-image');
var purgeInviteEmails = require('./lib/utils/dojo/purgeInviteEmails');
// Polls
// TODO: change import to require polls out of dojos.js
var cmd_save_poll_result = require('./lib/poll/save-poll-result');
var cmd_remove_poll_result = require('./lib/poll/remove-poll-result');
var cmd_poll_count = require('./lib/poll/poll-count');
var cmd_poll_get_list = require('./lib/poll/get-polled-list');
var cmd_get_poll_results = require('./lib/poll/get-poll-results');
var cmd_get_poll_setup = require('./lib/poll/get-poll-setup');
var cmd_save_poll_setup = require('./lib/poll/save-poll-setup');
//  Poll Channels
var cmd_start_poll = require('./lib/poll/start-poller');
var cmd_queue_email_poll = require('./lib/poll/channels/queue-email-poll');
var cmd_queue_sms_poll = require('./lib/poll/channels/queue-sms-poll');
var cmd_send_email_poll = require('./lib/poll/channels/send-email-poll');
var cmd_test_send_email_poll = require('./lib/poll/channels/send-test-email-poll');
var cmd_send_sms_poll = require('./lib/poll/channels/send-sms-poll');
var cmd_receive_sms_poll = require('./lib/poll/channels/save-sms-result');
var cmd_get_sms = require('./lib/poll/channels/get-sms');
var cmd_get_twiML = require('./lib/poll/channels/get-twiml');

var cmd_own_dojo = require('./lib/perm/own-dojo');
var cmd_have_perm_on_user = require('./lib/perm/have-permissions-on-user');
var cmd_have_perm_on_dojo = require('./lib/perm/have-permissions-on-dojo');
var cmd_is_founder = require('./lib/perm/is-founder');
var cmd_is_own_lead = require('./lib/perm/is-own-lead');
var cmd_belongs_to_dojo = require('./lib/perm/belongs-to-dojo');
var cmd_is_own_invite = require('./lib/perm/is-own-invite');
var cmd_can_award_badge = require('./lib/perm/can-award-badge');

var cmd_get_dojo_stats = require('./lib/dojos/stats');
var cmd_search_join_requests = require('./lib/dojos/search-join-requests');

var cmd_backfill_champions = require('./lib/backfill-champions');
// Utils
var purgeEBFields = require('./lib/utils/dojo/purgeEBFields');
var logger;

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-dojos';
  var ENTITY_NS = 'cd/dojos';
  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  var STATS_ENTITY_NS = 'cd/stats';
  var DOJO_LEADS_ENTITY_NS = 'cd/dojoleads';
  var DEFAULT_INVITE_USER_TYPE = 'mentor';
  var setupDojoSteps = require('./data/setup_dojo_steps');
  var dojoConfig = require('./data/dojos_config');
  var protocol = process.env.PROTOCOL || 'http';
  logger = options.logger;

  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'find'}, cmd_find);
  // CRUD Entities, BACKEND ONLY (unfiltered data, no return to front-end)
  seneca.add({role: plugin, entity: 'dojo', cmd: 'list'}, require('./lib/entities/dojo/search')());
  // Small fuckup (branches) created duplicate names, but functionnalities/params are the same
  seneca.add({role: plugin, entity: 'dojo', cmd: 'search'}, require('./lib/entities/dojo/search')());
  seneca.add({role: plugin, entity: 'dojo', cmd: 'load'}, require('./lib/entities/dojo/load')());
  seneca.add({role: plugin, entity: 'dojo', cmd: 'save'}, require('./lib/entities/dojo/save')());
  seneca.add({role: plugin, entity: 'dojo', cmd: 'update'}, require('./lib/entities/dojo/save')());
  // TODO: create w/ proper restrictions ?
  seneca.add({role: plugin, ctrl: 'dojo', cmd: 'save'}, require('./lib/controllers/dojo/save'));
  seneca.add({role: plugin, ctrl: 'dojo', cmd: 'submit'}, require('./lib/controllers/dojo/submit'));
  seneca.add({role: plugin, ctrl: 'dojo', cmd: 'verify'}, require('./lib/controllers/dojo/verify'));
  seneca.add({role: plugin, ctrl: 'dojo', cmd: 'delete'}, require('./lib/controllers/dojo/delete'));
  // Alias old behavior
  seneca.add({role: plugin, cmd: 'create'}, require('./lib/controllers/dojo/save'));
  seneca.add({role: plugin, cmd: 'update'}, require('./lib/controllers/dojo/save'));
  seneca.add({role: plugin, cmd: 'delete'}, require('./lib/controllers/dojo/delete'));

  seneca.add({role: plugin, ctrl: 'dojo', cmd: 'joinedDojos'}, require('./lib/controllers/dojo/joined-dojos'));
  seneca.add({role: plugin, cmd: 'update_image'}, cmd_update_image);
  seneca.add({role: plugin, cmd: 'dojos_count'}, cmd_dojos_count);
  seneca.add({role: plugin, cmd: 'dojos_by_country'}, cmd_dojos_by_country);
  seneca.add({role: plugin, cmd: 'dojos_state_count'}, cmd_dojos_state_count);
  seneca.add({role: plugin, cmd: 'bulk_update'}, cmd_bulk_update);
  seneca.add({role: plugin, cmd: 'bulk_delete'}, cmd_bulk_delete);
  seneca.add({role: plugin, cmd: 'get_stats'}, cmd_get_stats);
  // Lead
  seneca.add({role: plugin, entity: 'lead', cmd: 'save'}, require('./lib/entities/lead/save'));
  seneca.add({role: plugin, entity: 'lead', cmd: 'load'}, require('./lib/entities/lead/load'));
  seneca.add({role: plugin, entity: 'lead', cmd: 'list'}, require('./lib/entities/lead/list'));
  seneca.add({role: plugin, ctrl: 'lead', cmd: 'save'}, require('./lib/controllers/lead/save'));
  seneca.add({role: plugin, ctrl: 'lead', cmd: 'submit'}, require('./lib/controllers/lead/submit'));
  seneca.add({role: plugin, ctrl: 'lead', cmd: 'search'}, require('./lib/controllers/lead/search'));
  seneca.add({role: plugin, ctrl: 'lead', cmd: 'delete'}, require('./lib/controllers/lead/delete'));
  // Alias old behavior
  seneca.add({role: plugin, cmd: 'search_dojo_leads'}, require('./lib/controllers/lead/search'));
  seneca.add({role: plugin, cmd: 'simple_save_dojo_lead'}, require('./lib/entities/lead/save'));
  seneca.add({role: plugin, cmd: 'save_dojo_lead'}, require('./lib/controllers/lead/save'));
  seneca.add({role: plugin, cmd: 'update_dojo_lead'}, require('./lib/controllers/lead/save'));
  seneca.add({role: plugin, cmd: 'load_user_dojo_lead'}, cmd_load_user_dojo_lead);
  seneca.add({role: plugin, cmd: 'load_dojo_lead'}, require('./lib/entities/lead/load'));

  // UserDojo
  seneca.add({role: plugin, entity: 'userdojo', cmd: 'list'}, require('./lib/entities/dojo-users/list'));
  seneca.add({role: plugin, entity: 'userdojo', cmd: 'save'}, require('./lib/entities/dojo-users/save'));

  // Notifications :
  seneca.add({role: plugin, ctrl: 'notifications', channel: 'email', cmd: 'send'}, require('./lib/controllers/notifications/email/send'));
  // Alias old behavior
  seneca.add({role: plugin, cmd: 'send_email'}, require('./lib/controllers/notifications/email/send'));

  seneca.add({role: plugin, cmd: 'load_setup_dojo_steps'}, cmd_load_setup_dojo_steps);
  seneca.add({role: plugin, cmd: 'load_usersdojos'}, cmd_load_users_dojos);
  seneca.add({role: plugin, cmd: 'load_dojo_users'}, cmd_load_dojo_users);
  seneca.add({role: plugin, cmd: 'export_dojo_users'}, cmd_export_dojo_users);
  seneca.add({role: plugin, cmd: 'generate_user_invite_token'}, cmd_generate_user_invite_token);
  seneca.add({role: plugin, cmd: 'accept_user_invite'}, cmd_accept_user_invite);
  seneca.add({role: plugin, cmd: 'request_user_invite'}, cmd_request_user_invite);
  seneca.add({role: plugin, cmd: 'load_dojo_champion'}, cmd_load_dojo_champion);
  seneca.add({role: plugin, cmd: 'search_join_requests'}, cmd_search_join_requests);
  seneca.add({role: plugin, cmd: 'accept_user_request'}, require('./lib/dojos/accept-join-request'));
  seneca.add({role: plugin, cmd: 'decline_join_request'}, require('./lib/dojos/decline-join-request'));
  seneca.add({role: plugin, cmd: 'dojos_for_user'}, cmd_dojos_for_user);
  seneca.add({role: plugin, cmd: 'save_usersdojos'}, require('./lib/save-usersdojo'));
  seneca.add({role: plugin, cmd: 'remove_usersdojos'}, cmd_remove_usersdojos);
  seneca.add({role: plugin, cmd: 'get_user_types'}, cmd_get_user_types);
  seneca.add({role: plugin, cmd: 'get_user_permissions'}, cmd_get_user_permissions);
  seneca.add({role: plugin, cmd: 'create_dojo_email'}, cmd_create_dojo_email);
  seneca.add({role: plugin, cmd: 'get_dojo_config'}, cmd_get_dojo_config);
  seneca.add({role: plugin, cmd: 'load_dojo_admins'}, cmd_load_dojo_admins);
  seneca.add({role: plugin, cmd: 'load_ticketing_admins'}, cmd_load_ticketing_admins);
  seneca.add({role: plugin, cmd: 'user_is_dojo_admin'}, cmd_user_is_dojo_admin);
  seneca.add({role: plugin, cmd: 'update_founder'}, cmd_update_dojo_founder);
  seneca.add({role: plugin, cmd: 'search_nearest_dojos'}, cmd_search_nearest_dojos);
  seneca.add({role: plugin, cmd: 'search_bounding_box'}, cmd_search_bounding_box);
  seneca.add({role: plugin, cmd: 'list_query'}, cmd_list_query);
  seneca.add({role: plugin, cmd: 'find_dojolead'}, cmd_find_dojolead);
  seneca.add({role: plugin, cmd: 'load_dojo_email'}, cmd_load_dojo_email);
  seneca.add({role: plugin, cmd: 'notify_all_members'}, cmd_notify_all_members);
  seneca.add({role: plugin, cmd: 'add_children_parent_dojo'}, addChildrenParentDojo);
  seneca.add({role: plugin, cmd: 'notify_dojo_members'}, require('./lib/dojos/users/notify'));
  seneca.add({role: plugin, cmd: 'add_children_parent_dojo'}, addChildrenParentDojo.bind(seneca));

  //  TODO:10 : export as a different microservice?
  //  Polls channels
  seneca.add({role: plugin, cmd: 'start_poll'}, cmd_start_poll);
  seneca.add({role: plugin, cmd: 'get_polled_list'}, cmd_poll_get_list);
  seneca.add({role: plugin, cmd: 'queue_email_poll'}, cmd_queue_email_poll);
  seneca.add({role: plugin, cmd: 'queue_sms_poll'}, cmd_queue_sms_poll);
  seneca.add({role: plugin, cmd: 'send_email_poll'}, cmd_send_email_poll);
  seneca.add({role: plugin, cmd: 'send_test_email_poll'}, cmd_test_send_email_poll);
  seneca.add({role: plugin, cmd: 'send_sms_poll'}, cmd_send_sms_poll);
  seneca.add({role: plugin, cmd: 'save_sms_poll_result'}, cmd_receive_sms_poll);
  seneca.add({role: plugin, cmd: 'get_sms'}, cmd_get_sms);
  seneca.add({role: plugin, cmd: 'get_twiML'}, cmd_get_twiML);
  // Poll entity
  seneca.add({role: plugin, cmd: 'get_poll_setup'}, cmd_get_poll_setup);
  seneca.add({role: plugin, cmd: 'save_poll_setup'}, cmd_save_poll_setup);
  seneca.add({role: plugin, cmd: 'get_poll_results'}, cmd_get_poll_results);
  seneca.add({role: plugin, cmd: 'save_poll_result'}, cmd_save_poll_result);
  seneca.add({role: plugin, cmd: 'remove_poll_result'}, cmd_remove_poll_result);
  seneca.add({role: plugin, cmd: 'poll_count'}, cmd_poll_count);
  // Perms
  seneca.add({role: plugin, cmd: 'own_dojo'}, cmd_own_dojo);
  seneca.add({role: plugin, cmd: 'is_founder'}, cmd_is_founder);
  seneca.add({role: plugin, cmd: 'have_permissions_on_user'}, cmd_have_perm_on_user);
  seneca.add({role: plugin, cmd: 'have_permissions_on_dojo'}, cmd_have_perm_on_dojo);
  seneca.add({role: plugin, cmd: 'is_own_lead'}, cmd_is_own_lead);
  seneca.add({role: plugin, cmd: 'belongs_to_dojo'}, cmd_belongs_to_dojo);
  seneca.add({role: plugin, cmd: 'is_own_invite'}, cmd_is_own_invite);
  seneca.add({role: plugin, cmd: 'can_award_badge'}, cmd_can_award_badge);

  // from countries service
  seneca.add({role: plugin, cmd: 'countries_continents'}, cmd_countries_continents);
  seneca.add({role: plugin, cmd: 'list_countries'}, cmd_list_countries);
  seneca.add({role: plugin, cmd: 'list_places'}, cmd_list_places);
  seneca.add({role: plugin, cmd: 'countries_lat_long'}, cmd_countries_lat_long);
  seneca.add({role: plugin, cmd: 'continents_lat_long'}, cmd_continents_lat_long);
  seneca.add({role: plugin, cmd: 'continent_codes'}, cmd_get_continent_codes);
  seneca.add({role: plugin, cmd: 'reverse_geocode'}, cmd_reverse_geocode);

  // User stats of a dojo
  seneca.add({role: plugin, cmd: 'get_dojo_stats'}, cmd_get_dojo_stats);

  // One shot
  seneca.add({role: plugin, cmd: 'backfill_champions'}, cmd_backfill_champions);

  if (options.kue && options.kue.start) {
    var kues = ['batch-poller', 'sms-poll', 'email-poll'];

    seneca.act({role: 'kue-queue', cmd: 'start', config: options.kue}, function (err, queue) {
      if (!err) {
        async.eachSeries(kues, function (kue, cb) {
          seneca.act({role: 'kue-queue', cmd: 'work', name: kue}, function (err, worker) {
            if (err) return new Error(err);
            cb();
          });
        });
      } else {
        return new Error('Redis queue couldn\'t be started');
      }
    });
  }

  function cmd_update_dojo_founder (args, cmdCb) {
    logger.info({args: args}, 'cmd_update_dojo_founder');
    var founder = args.founder;
    var seneca = this;

    if (_.isEmpty(founder)) {
      return cmdCb(new Error('Founder is empty'));
    }

    async.waterfall([
      isCDFAdmin,
      getPreviousFounderUserDojo,
      updatePreviousFounderUserDojo,
      getCurrentFounderUserDojo,
      updateOrCreateUserDojo,
      updateDojoCreatorEmail
    ], cmdCb);

    function isCDFAdmin (done) {
      var userId = args.user.id;

      seneca.act({role: 'cd-users', cmd: 'load', id: userId, user: args.user}, function (err, user) {
        if (err) {
          return done(err);
        }

        if (!_.includes(user.roles, 'cdf-admin')) {
          return done(new Error('Unauthorized'));
        }

        return done();
      });
    }

    function getPreviousFounderUserDojo (done) {
      var query = {};

      query.userId = founder.previousFounderId;
      query.owner = 1;
      query.dojoId = founder.dojoId;
      seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: query}, function (err, usersDojos) {
        if (err) {
          return done(err);
        }
        var userDojo = usersDojos[0];
        return done(null, userDojo);
      });
    }

    function updatePreviousFounderUserDojo (userDojo, done) {
      if (_.isEmpty(userDojo)) {
        return done(new Error('Cannot find previous founder'));
      }

      userDojo.owner = 0;

      seneca.act({role: 'cd-dojos', cmd: 'save_usersdojos', userDojo: userDojo, user: args.user}, done);
    }

    function getCurrentFounderUserDojo (prevFounderUserDojo, done) {
      var query = {};
      query.userId = founder.id;
      query.dojoId = founder.dojoId;

      seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: query}, function (err, currentFounder) {
        if (err) return done(err);
        return done(null, currentFounder[0]);
      });
    }

    function updateOrCreateUserDojo (userDojo, done) {
      if (_.isEmpty(userDojo)) {
        userDojo = {};
        userDojo.dojoId = founder.dojoId;
        userDojo.userId = founder.id;
      }

      if (!userDojo.userTypes) userDojo.userTypes = [];

      if (!_.includes(userDojo.userTypes, 'champion')) userDojo.userTypes.push('champion');

      if (!userDojo.userPermissions) userDojo.userPermissions = [];

      if (!_.includes(userDojo.userPermissions, 'dojo-admin')) {
        userDojo.userPermissions.push({
          title: 'Dojo Admin',
          name: 'dojo-admin'
        });
      }

      if (!_.includes(userDojo.userPermissions, 'ticketing-admin')) {
        userDojo.userPermissions.push({
          title: 'Ticketing Admin',
          name: 'ticketing-admin'
        });
      }
      userDojo.owner = 1;
      seneca.act({role: 'cd-dojos', cmd: 'save_usersdojos', userDojo: userDojo, user: args.user}, done);
    }

    function updateDojoCreatorEmail (userDojo, done) {
      var userId = userDojo.userId;
      var dojoId = userDojo.dojoId;

      if (!userId || !dojoId) return done(null, {ok: false, why: 'No userId or dojoId for new Dojo creator.'});

      async.waterfall([
        loadUser,
        updateDojo
      ], done);

      function loadUser (cb) {
        seneca.act({role: 'cd-users', cmd: 'load', id: userId, user: args.user}, function (err, val) {
          if (err) return done(err);
          cb(err, val);
        });
      }

      function updateDojo (user, cb) {
        seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, dojo) {
          if (err) return done(err);
          dojo.creatorEmail = user.email;
          seneca.act({role: plugin, cmd: 'update', dojo: dojo, user: args.user}, cb);
        });
      }
    }
  }

  function cmd_create_dojo_email (args, done) {
    logger.info({args: args}, 'cmd_create_dojo_email');
    if (!args.dojo) {
      return done(new Error('Dojo data is missing.'));
    }

    if (!_.get(options, 'google-api.enabled')) {
      return done();
    }

    // check if Google API private key file exists
    if (!fs.existsSync(options['google-api'].keyFile)) {
      return done('Google API private key not found', null);
    }

    var jwt = new google.auth.JWT(
      options['google-api'].email,
      options['google-api'].keyFile,
      '',
      options['google-api'].scopes,
      options['google-api'].subject
    );

    jwt.authorize(function (err, data) {
      if (err) {
        return done(err);
      }

      getGoogleUserData(args.dojo, function (err, res) {
        if (err) {
          return done(err);
        }

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
            return done(err);
          }

          seneca.act({role: 'cd-users', cmd: 'load', id: dojo.creator, user: args.user}, function (err, dojoCreator) {
            if (err) {
              return done(err);
            }

            var locality = args.locality || 'en_US';
            var code = 'google-email-pass-';

            // send dojo creator an email with dojo's newly created email address and it's temp password
            var payload = {
              to: dojoCreator.email,
              code: code,
              locality: locality,
              content: {temp_pass: tempPass, dojo: dojo.name, email: googleNewAccountData.primaryEmail}
            };
            seneca.act({role: plugin, cmd: 'send_email', payload: payload}, function (err, res) {
              if (err) {
                return done(err);
              }

              done(null, data);
            });
          });
        });
      });
    });
  }

  function getGoogleUserData (dojo, done) {
    var userData = {};

    seneca.act('role:cd-dojos,cmd:load', {id: dojo.id}, function (err, res) {
      if (err) {
        return done(err);
      }

      dojo = res.data$();

      // this can look something like this: nsc-mahon-cork.ie@coderdojo.com
      var primaryEmail = _.last(dojo.urlSlug.split('/')).concat('.', dojo.alpha2.toLowerCase(), '@coderdojo.com');

      if (process.env.ENVIRONMENT === 'development') {
        primaryEmail = 'dev-' + primaryEmail;
      }

      // required user data
      userData.name = {
        familyName: dojo.name, // this can be changed with the champion name & family name
        givenName: dojo.placeName || dojo.address1
      };
      var pass = randomstring.generate(8);
      userData.tempPass = pass;
      userData.password = sha1sum(pass);// use default pass for now; replace this with random pass when finished
      userData.hashFunction = 'SHA-1';
      userData.primaryEmail = primaryEmail;
      userData.changePasswordAtNextLogin = true;
      userData.emails = [
        {
          address: 'cristian.kiss@nearform.com',
          type: 'other',
          customType: '',
          primary: false
        }
      ];
      userData.organizations = [
        {
          name: 'nearform_test',
          title: 'champion',
          primary: true,
          type: 'school',
          description: 'new test dojo',
          domain: 'coderdojo.org'
        }
      ];

      return done(null, {userData: userData, dojo: dojo});
    });
  }

  function sha1sum (input) {
    return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex');
  }

  function cmd_search (args, done) {
    logger.info({args: args}, 'cmd_search');
    async.waterfall([
      function (done) {
        var query = args.query;
        if (query.name) query.name = new RegExp(query.name, 'i');
        if (query.email) query.email = new RegExp(query.email, 'i');
        if (query.creatorEmail) query.creatorEmail = new RegExp(query.creatorEmail, 'i');

        // taken from https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
        // needed because if a userCreator email is abc+xyz@example.com, it breaks the input string for
        // building the regExps
        // function escapeRegExp(string){
        //   return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // }
        seneca.act({role: plugin, cmd: 'list', query: query}, done);
      },
      function (searchResults, done) {
        async.each(searchResults, function (dojo, cb) {
          seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojo.id, owner: 1}},
            function (err, userDojos) {
              if (err) return cb(err);
              if (userDojos.length < 1) return cb();
              var userIds = _.map(userDojos, 'userId');
              seneca.act({role: 'cd-users', cmd: 'list', ids: userIds}, function (err, users) {
                if (err) return cb(err);
                dojo.creators = _.map(users, function (user) {
                  return {email: user.email, id: user.id};
                });
                return cb();
              });
            });
        }, function (err) {
          if (err) return done(err);
          return done(null, searchResults);
        });
      },
      function (searchResult, done) {
        var userIds = _.chain(searchResult).map('creators').flatten().map('id').uniq().value();
        if (userIds.length > 0) {
          seneca.act({role: 'cd-agreements', cmd: 'list', query: {userId: {in$: userIds}}}, function (err, agreements) {
            if (err) return done(err);
            agreements = _.keyBy(agreements, 'userId');
            _.forEach(searchResult, function (dojo) {
              dojo.agreements = [];
              _.forEach(dojo.creators, function (creator) {
                creator.agreements = [];
                if (agreements[creator.id]) {
                  creator.agreements = agreements[creator.id].agreements;
                }
              });
            });
            return done(null, searchResult);
          });
        } else {
          return done(null, []);
        }
      }
    ], function (err, res) {
      if (err) return done(null, {error: err});
      return done(null, res);
    });
  }

  function cmd_dojos_state_count (args, done) {
    logger.info({args: args}, 'cmd_dojos_state_count');
    var country = args.country;
    var countData = {};

    seneca.make$(ENTITY_NS).list$({limit$: 'NULL', alpha2: country, deleted: 0, verified: 1}, function (err, response) {
      if (err) return done(err);
      countData[country] = {};
      _.forEach(response, function (dojo) {
        if (dojo.coordinates && dojo.stage !== 4) {
          if (!countData[dojo.alpha2][dojo.admin1Name]) countData[dojo.alpha2][dojo.admin1Name] = {total: 0};
          countData[dojo.alpha2][dojo.admin1Name].total += 1;
          countData[dojo.alpha2][dojo.admin1Name].latitude = dojo.coordinates.split(',')[0];
          countData[dojo.alpha2][dojo.admin1Name].longitude = dojo.coordinates.split(',')[1];
        }
      });
      done(null, countData);
    });
  }

  function cmd_dojos_count (args, done) {
    logger.info({args: args}, 'cmd_dojos_count');
    async.waterfall([
      getDojos,
      getCountries,
      getDojoCount
    ], done);

    function getDojos (done) {
      var dojos = [];
      var query = {limit$: 'NULL'};
      query.deleted = 0;
      query.verified = 1;
      seneca.make$(ENTITY_NS).list$(query, function (err, response) {
        if (err) return response;
        async.each(response, function (dojo, cb) {
          if (dojo.stage !== 4) {
            dojos.push(dojo);
          }

          cb();
        }, function () {
          done(null, dojos);
        });
      });
    }

    function getCountries (dojos, done) {
      seneca.act({role: 'cd-countries', cmd: 'countries_continents'}, function (err, response) {
        if (err) return done(err);
        done(null, dojos, response);
      });
    }

    function getDojoCount (dojos, countries, done) {
      var countData = {dojos: {continents: {}}};
      _.each(dojos, function (dojo) {
        if (countries.countries[dojo.alpha2]) {
          var continent = countries.countries[dojo.alpha2].continent;
          if (!countData.dojos.continents[continent]) countData.dojos.continents[continent] = {total: 0, countries: {}};
          countData.dojos.continents[continent].total += 1;
          if (!countData.dojos.continents[continent].countries[dojo.alpha2]) countData.dojos.continents[continent].countries[dojo.alpha2] = {total: 0};
          countData.dojos.continents[continent].countries[dojo.alpha2].total += 1;
        }
      });
      done(null, countData);
    }
  }

  function cmd_list (args, done) {
    logger.info({args: args}, 'cmd_list');
    var query = args.query || {};
    if (!query.limit$) query.limit$ = 'NULL';
    if (query.mysqlDojoId && query.mysqlDojoId.toString().length > 8) return done(null, []);
    seneca.make$(ENTITY_NS).list$(query, function (err, dojos) {
      if (err) return done(err);

      _.each(dojos, function (dojo) {
        if (dojo.userInvites) {
          dojo.userInvites = purgeInviteEmails(dojo.userInvites);
        }
        dojo = purgeEBFields(dojo);
      });
      done(null, dojos);
    });
  }

  function cmd_dojos_by_country (args, done) {
    var query = args.query || {};
    var dojosByCountry = {};

    seneca.act({role: plugin, cmd: 'list', query: query}, function (err, dojos) {
      if (err) return done(err);
      _.each(dojos, function (dojo) {
        if (dojo.userInvites) {
          dojo.userInvites = purgeInviteEmails(dojo.userInvites);
        }
        dojo = purgeEBFields(dojo);
        if (!dojosByCountry[dojo.countryName]) dojosByCountry[dojo.countryName] = [];
        dojosByCountry[dojo.countryName].push(dojo);
      });

      _.each(Object.keys(dojosByCountry), function (countryName) {
        dojosByCountry[countryName] = _.sortBy(dojosByCountry[countryName], function (dojos) {
          return dojos.name.toLowerCase();
        });
      });
      return done(null, dojosByCountry);
    });
  }

  function cmd_load (args, done) {
    logger.info({args: args}, 'cmd_load');
    seneca.make$(ENTITY_NS).load$(args.id, function (err, response) {
      if (err) return done(err);
      if (response) {
        if (response.userInvites) {
          response.userInvites = purgeInviteEmails(response.userInvites);
        }
        response = purgeEBFields(response);
      }
      done(null, response);
    });
  }

  function cmd_find (args, done) {
    logger.info({args: args}, 'cmd_find');
    if (args.query) {
      args.query.deleted = 0;
    }
    seneca.make$(ENTITY_NS).load$(args.query, function (err, response) {
      if (err) return done(err);

      if (response) {
        if (response.userInvites) {
          response.userInvites = purgeInviteEmails(response.userInvites);
        }
        response = purgeEBFields(response);
      }
      done(null, response);
    });
  }

  function cmd_bulk_update (args, done) {
    logger.info({args: args}, 'cmd_bulk_update');
    async.each(args.dojos, function (dojo, cb) {
      seneca.act({role: plugin, cmd: 'update', dojo: dojo, user: args.user}, cb);
    }, done);
  }

  function cmd_bulk_delete (args, done) {
    logger.info({args: args}, 'cmd_bulk_delete');
    async.map(args.dojos, function deleteDojo (dojo, cb) {
      seneca.act({role: plugin, ctrl: 'dojo', cmd: 'delete', dojo: dojo, user: args.user}, cb);
    }, done);
  }

  function cmd_get_stats (args, done) {
    seneca.make$(STATS_ENTITY_NS).list$({limit$: 'NULL'}, function (err, dojos) {
      if (err) {
        return done(err);
      }

      var dojoMappedByContinent = {};

      _.forEach(dojos, function (dojo) {
        if (!dojoMappedByContinent[dojo.continent]) {
          dojoMappedByContinent[dojo.continent] = [];
        }

        dojoMappedByContinent[dojo.continent].push(dojo);
      });

      done(null, dojoMappedByContinent);
    });
  }

  function cmd_find_dojolead (args, done) {
    if (!args.query) return done;
    seneca.make$(DOJO_LEADS_ENTITY_NS).load$(args.query, done);
  }

  /*
   * Returns the uncompleted dojo lead for a certain user.
   * There should be only one uncompleted dojo lead at a moment.
   */
  function cmd_load_user_dojo_lead (args, done) {
    var dojoLeadEntity = seneca.make$(DOJO_LEADS_ENTITY_NS);

    var query = {
      userId: args.id,
      completed: false
    };

    dojoLeadEntity.load$(query, done);
  }

  function cmd_load_setup_dojo_steps (args, done) {
    done(null, setupDojoSteps);
  }

  function cmd_load_users_dojos (args, done) {
    var usersdojos_ent;
    var query = args.query ? args.query : {};

    query.deleted = 0;

    usersdojos_ent = seneca.make$(USER_DOJO_ENTITY_NS);
    usersdojos_ent.list$(query, function (err, usersDojos) {
      if (err) {
        return done(err);
      }
      done(null, usersDojos);
    });
  }

  function cmd_load_dojo_users (args, done) {
    logger.info({args: args}, 'cmd_load_dojo_users');
    var query = args.query || {};
    var typeQuery = null;
    var nameQuery = null;
    var skip = 0;
    var userListQuery = {};
    if (query.sort$) {
      userListQuery.sort$ = query.sort$;
      delete query.sort$;
    }

    if (query.userType) {
      typeQuery = query.userType;
      delete query.userType;
    }

    if (query.name) {
      nameQuery = RegExp(query.name, 'i');
      delete query.name;
    }

    if (query.limit$) {
      var limit = query.limit$;
      query.limit$ = 'NULL';
    }

    if (query.skip$) {
      skip = query.skip$;
      delete query.skip$;
    }

    seneca.act({role: plugin, cmd: 'load_usersdojos', query: query}, function (err, response) {
      if (err) return done(err);
      // column name must match the casing in the DB as per latest changes in seneca-postgresql-store
      userListQuery.fields$ = ['name', 'email', 'init_user_type', 'profile_id', 'dob', 'user_id'];
      if (typeQuery) {
        response = _.filter(response, function (user) {
          return _.includes(user.userTypes, typeQuery);
        });
      }
      // user id is returned by default
      userListQuery.ids = _.uniq(_.map(response, 'userId'));
      var length = userListQuery.ids.length;
      if (length === 0) {
        // Force return empty array when no users are found
        return done(null, {response: [], length: 0});
      }
      if (nameQuery) {
        seneca.act({role: 'cd-user-profile', cmd: 'list', query: userListQuery}, function (err, response) {
          if (err) return done(err);
          response = _.filter(response, function (r) {
            return r.name.match(nameQuery);
          });
          length = response.length;
          if (skip && limit) {
            response = response.slice(skip, limit + skip);
          }
          return done(null, {response: response, length: length});
        });
      } else {
        userListQuery.skip$ = skip;
        userListQuery.limit$ = limit;
        seneca.act({role: 'cd-user-profile', cmd: 'list', query: userListQuery}, function (err, response) {
          if (err) return done(err);
          done(null, {response: response, length: length});
        });
      }
    });
  }

  function cmd_generate_user_invite_token (args, done) {
    var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';
    var inviteEmail = args.email;
    var emailSubject = args.emailSubject;
    var dojoId = args.dojoId;
    var userType = args.userType;
    var inviteToken = shortid.generate();
    var currentUser = args.user;
    if (!userType) userType = DEFAULT_INVITE_USER_TYPE;

    async.waterfall([
      getDojo,
      generateInviteToken,
      getUserTypeTitle,
      sendEmail
    ], done);

    function getDojo (done) {
      seneca.act({role: plugin, cmd: 'load', id: dojoId}, done);
    }

    function generateInviteToken (dojo, done) {
      var timestamp = new Date();
      var userInvite = {id: inviteToken, email: inviteEmail, userType: userType, timestamp: timestamp};
      if (!dojo.userInvites) dojo.userInvites = [];
      dojo.userInvites.push(userInvite);
      dojo.userInvites = _.sortBy(dojo.userInvites, function (userInvite) {
        return userInvite.timestamp;
      });
      dojo.userInvites.reverse();
      dojo.userInvites = _.uniq(dojo.userInvites, function (userInvite) {
        return userInvite.email;
      });

      seneca.act({role: plugin, cmd: 'update', user: currentUser, dojo: dojo}, done);
    }

    function getUserTypeTitle (dojo, done) {
      seneca.act({role: 'cd-users', cmd: 'get_init_user_types'}, function (err, userTypes) {
        if (err) return done(err);
        var userTypeFound = _.find(userTypes, function (userTypeObj) {
          return userTypeObj.name === userType;
        });
        var userTypeTitle = (userTypeFound && userTypeFound.title) || 'member';
        return done(null, userTypeTitle, dojo);
      });
    }

    function sendEmail (userTypeTitle, dojo, done) {
      var content = {
        link: protocol + '://' + zenHostname + '/dashboard/accept_dojo_user_invitation/' + dojo.id + '/' + inviteToken,
        userType: userTypeTitle,
        dojoName: dojo.name,
        year: moment(new Date()).format('YYYY')
      };

      var locality = args.locality || 'en_US';
      var code = 'invite-user-';

      var payload = {to: inviteEmail, code: code, locality: locality, from: '"' + dojo.name + '" <' + options.shared.botEmail + '>', replyTo: dojo.email, content: content, subject: emailSubject};
      seneca.act({role: plugin, cmd: 'send_email', payload: payload}, done);
    }
  }

  function cmd_accept_user_invite (args, done) {
    logger.info({args: args}, 'cmd_accept_user_invite');
    var data = args.data;
    var dojoId = data.dojoId;
    var inviteToken = data.inviteToken;
    var currentUserId = data.currentUserId;

    async.waterfall([
      loadInviteToken,
      addUserToDojo,
      deleteInviteToken
    ], function (err, res) {
      if (err) return done(null, {error: err.message});
      return done(null, res);
    });

    function loadInviteToken (done) {
      seneca.act({role: plugin, cmd: 'load'}, {id: dojoId}, function (err, response) {
        if (err) return done(err);
        var userInvites = response.userInvites;
        var inviteFound = _.find(userInvites, function (userInvite) {
          if (userInvite.id === inviteToken) {
            return userInvite;
          }
        });
        if (!inviteFound) return done(new Error('Invalid Invite Request.'));
        return done(null, inviteFound);
      });
    }

    function addUserToDojo (inviteToken, done) {
      // Add user to dojo users if not already added.
      seneca.act({
        role: plugin,
        cmd: 'load_usersdojos',
        query: {userId: currentUserId, dojoId: dojoId}
      }, function (err, response) {
        if (err) return done(err);
        var userDojo = {};
        if (_.isEmpty(response)) {
          userDojo.owner = 0;
          userDojo.userId = currentUserId;
          userDojo.dojoId = dojoId;
          userDojo.userTypes = [];
          userDojo.userTypes.push(inviteToken.userType);
          // If invite token user type is champion, update user permissions
          if (inviteToken.userType === 'champion') {
            userDojo.userPermissions = [
              {title: 'Dojo Admin', name: 'dojo-admin'},
              {title: 'Ticketing Admin', name: 'ticketing-admin'}
            ];
          }

          seneca.act({role: plugin, cmd: 'save_usersdojos', userDojo: userDojo, invite: inviteToken}, function (err, response) {
            if (err) return done(err);
            return done(null, inviteToken);
          });
        } else {
          // userDojo entity already exists.
          // Update the userTypes array.
          userDojo = response[0];
          if (!userDojo.userTypes) userDojo.userTypes = [];
          userDojo.userTypes.push(inviteToken.userType);
          // If invite token user type is champion, update user permissions
          if (inviteToken.userType === 'champion') {
            userDojo.userPermissions = [
              {title: 'Dojo Admin', name: 'dojo-admin'},
              {title: 'Ticketing Admin', name: 'ticketing-admin'}
            ];
          }
          seneca.act({role: plugin, cmd: 'save_usersdojos', userDojo: userDojo, invite: inviteToken}, function (err, response) {
            if (err) return done(err);
            return done(null, inviteToken);
          });
        }
      });
    }

    function deleteInviteToken (inviteToken, done) {
      seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, dojo) {
        if (err) return done(err);
        dojo.userInvites = _.without(dojo.userInvites, _.find(dojo.userInvites, {id: inviteToken.id}));
        seneca.act({role: plugin, cmd: 'update', dojo: dojo, user: args.user}, function (err, response) {
          if (err) return done(err);
          return done();
        });
      });
    }
  }

  function cmd_request_user_invite (args, done) {
    logger.info({args: args}, 'cmd_request_user_invite');
    var inviteToken = shortid.generate();
    var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';
    var data = args.data;
    var user = data.user || {};
    var userType = data.userType;
    var emailSubject = data.emailSubject;
    var dojoId = data.dojoId;
    if (!userType) userType = DEFAULT_INVITE_USER_TYPE;

    async.waterfall([
      getDojo,
      generateInviteToken,
      sendEmail
    ], function (err, res) {
      if (err) return done(null, {error: err.message});
      return done(null, res);
    });

    function getDojo (done) {
      seneca.act({role: plugin, cmd: 'load', id: dojoId}, done);
    }

    function generateInviteToken (dojo, done) {
      var timestamp = new Date();
      var joinRequest = {id: inviteToken, dojoId: dojoId, userType: userType, timestamp: timestamp};
      if (!user.joinRequests) user.joinRequests = [];
      user.joinRequests.push(joinRequest);
      user.joinRequests = _.chain(user.joinRequests)
        .sortBy(function (joinRequest) {
          return joinRequest.timestamp;
        })
        .reverse()
        .uniq(true, function (joinRequest) {
          return joinRequest.dojoId;
        });
      var toBeUpdated = _.pick(user, ['id', 'joinRequests']);
      seneca.act({role: 'cd-users', cmd: 'update', user: toBeUpdated, id: user.id}, function (err, response) {
        if (err) return done(err);
        return done(null, dojo);
      });
    }

    function sendEmail (dojo, done) {
      if (!dojo) return done();
      var content = {
        link: protocol + '://' + zenHostname + '/dashboard/accept_dojo_user_request/' + user.id + '/' + inviteToken,
        name: user.name,
        email: user.email,
        dojoName: dojo.name,
        userType: userType
      };

      var locality = args.locality || 'en_US';
      var code = 'user-request-to-join-';

      if (!dojo.email) return done(new Error('This Dojo has no email setup.'));
      var payload = {to: dojo.email, code: code, locality: locality, content: content, subject: emailSubject, replyTo: user.email};
      seneca.act({role: plugin, cmd: 'send_email', payload: payload}, done);
    }
  }

  function cmd_load_dojo_champion (args, done) {
    logger.info({args: args}, 'cmd_load_dojo_champion');
    var dojoId = args.id;
    var query = {dojoId: dojoId};
    seneca.act({role: plugin, cmd: 'load_dojo_users', query: query}, function (err, response) {
      if (err) return done(err);
      // Check cd/usersdojos for the champion user type
      var champions = [];
      response = response.response;
      async.each(response, function (user, cb) {
        var query = {userId: user.id, dojoId: dojoId};
        seneca.act({role: plugin, cmd: 'load_usersdojos', query: query}, function (err, response) {
          if (err) return cb(err);
          var userDojo = response[0];
          if (!userDojo) return cb();
          if (_.includes(userDojo.userTypes, 'champion')) champions.push(user);
          cb();
        });
      }, function () {
        done(null, champions);
      });
    });
  }

  function cmd_dojos_for_user (args, done) {
    logger.info({args: args}, 'cmd_dojos_for_user');
    var query = {
      userId: args.id,
      deleted: 0
    };
    var dojos = [];
    seneca.act({role: plugin, cmd: 'load_usersdojos', query: query}, function (err, response) {
      if (err) return done(err);
      var dojoEntity = seneca.make$(ENTITY_NS);
      async.each(response, function (userDojoLink, cb) {
        query = {
          id: userDojoLink.dojoId,
          deleted: 0
        };
        dojoEntity.load$(query, function (err, response) {
          if (err) return cb(err);
          if (response) dojos.push(response);
          cb();
        });
      }, function (err) {
        if (err) return done(err);
        done(null, dojos);
      });
    });
  }

  function cmd_remove_usersdojos (args, done) {
    var data = args.data;
    var userId = data.userId;
    var dojoId = data.dojoId;
    var emailSubject = data.emailSubject;
    var usersDojosEntity = seneca.make$(USER_DOJO_ENTITY_NS);

    async.waterfall([
      ownerPermissionsCheck,
      removeUserDojoLink,
      loadUserAndDojoDetails,
      loadDojoChampion,
      emailDojoChampion
    ], function (err, res) {
      if (err) return done(null, {error: err.message});
      return done(null, res);
    });

    function ownerPermissionsCheck (cb) {
      // Prevent the deletion of the dojo owner.
      usersDojosEntity.load$({userId: userId, dojoId: dojoId, deleted: 0}, function (err, response) {
        if (err) return cb(err);
        var userDojo = response;
        if (userDojo.owner === 1) return cb(new Error('Dojo owners cannot be removed.'));
        return cb(null, userDojo);
      });
    }

    function removeUserDojoLink (usersDojo, cb) {
      usersDojo.deleted = 1;
      usersDojo.deletedBy = args.user.id;
      usersDojo.deletedAt = new Date();

      // Remove ninjas.
      seneca.make$(USER_DOJO_ENTITY_NS).save$(usersDojo, function (err, response) {
        if (err) return cb(err);
        seneca.act({role: 'cd-profiles', cmd: 'list', query: {userId: userId}}, function (err, userProfiles) {
          if (err) return cb(err);
          var userProfile = userProfiles[0];
          if (!userProfile.children) return cb(null, response);
          async.each(userProfile.children, function (youthUserId, cb) {
            seneca.act({
              role: plugin,
              cmd: 'load_usersdojos',
              query: {userId: youthUserId, dojoId: dojoId}
            }, function (err, youthUsersDojos) {
              if (err) return cb(err);
              if (youthUsersDojos && youthUsersDojos.length > 0) {
                var youthUserDojo = youthUsersDojos[0];
                youthUserDojo.deleted = 1;
                youthUserDojo.deletedBy = args.user.id;
                youthUserDojo.deletedAt = new Date();
                seneca.act({role: plugin, cmd: 'save_usersdojos', userDojo: youthUserDojo, user: args.user}, cb);
              } else {
                return cb();
              }
            });
          }, function (err, res) {
            if (err) return cb(err);
            return cb(null, response);
          });
        });
      });
    }

    function loadUserAndDojoDetails (usersDojo, cb) {
      async.waterfall([
        loadUser,
        loadDojo
      ], function (err, user, dojo) {
        if (err) return cb(err);
        return cb(null, user, dojo);
      });

      function loadUser (callback) {
        seneca.act({role: 'cd-users', cmd: 'load', id: userId, user: args.user}, function (err, user) {
          if (err) return callback(err);
          return callback(null, user);
        });
      }

      function loadDojo (user, callback) {
        seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, response) {
          if (err) return callback(err);
          return callback(null, user, response);
        });
      }
    }

    function loadDojoChampion (user, dojo, cb) {
      seneca.act({role: plugin, cmd: 'load_dojo_champion', id: dojo.id}, function (err, response) {
        if (err) return cb(err);
        var champion = response[0];
        return cb(null, user, dojo, champion);
      });
    }

    function emailDojoChampion (user, dojo, champion, cb) {
      if (!champion) return cb();
      var content = {
        name: user.name,
        email: user.email,
        dojoName: dojo.name
      };

      var locality = args.locality || 'en_US';
      var code = 'user-left-dojo-';

      var payload = {to: champion.email, code: code, locality: locality, content: content, subject: emailSubject};
      seneca.act({role: plugin, cmd: 'send_email', payload: payload}, cb);
    }
  }

  function cmd_get_user_types (args, done) {
    var userTypes = ['attendee-o13', 'parent-guardian', 'mentor', 'champion'];
    setImmediate(function () {
      done(null, userTypes);
    });
  }

  function cmd_get_user_permissions (args, done) {
    var userPermissions = [
      {title: 'Dojo Admin', name: 'dojo-admin'},
      {title: 'Ticketing Admin', name: 'ticketing-admin'}
    ];
    setImmediate(function () {
      done(null, userPermissions);
    });
  }

  function cmd_get_dojo_config (args, done) {
    setImmediate(function () {
      done(null, dojoConfig);
    });
  }

  function sanitiseAdmin (admin) {
    delete admin.pass;
    delete admin.salt;
    delete admin.phone;
    return (admin);
  }

  function cmd_load_dojo_admins (args, done) {
    var seneca = this;
    var dojoId = args.dojoId;

    seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojoId}}, function (err, usersDojos) {
      if (err) return done(err);
      async.map(usersDojos, function (userDojo, cb) {
        var dojoAdminPermissionFound = _.find(userDojo.userPermissions, function (userPermission) {
          return userPermission.name === 'dojo-admin';
        });
        if (dojoAdminPermissionFound) {
          seneca.act({role: 'cd-users', cmd: 'load', id: userDojo.userId, user: args.user}, function (err, admin) { return cb(err, sanitiseAdmin(admin)); });
        } else {
          return cb();
        }
      }, function (err, dojoAdmins) {
        if (err) return done(err);
        dojoAdmins = _.chain(dojoAdmins)
          .flatten()
          .compact()
          .value();
        return done(null, dojoAdmins);
      });
    });
  }

  function cmd_load_ticketing_admins (args, done) {
    var seneca = this;
    var dojoId = args.dojoId;

    seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojoId}}, function (err, usersDojos) {
      if (err) return done(err);
      async.map(usersDojos, function (userDojo, cb) {
        var dojoTicketingAdminPermissionFound = _.find(userDojo.userPermissions, function (userPermission) {
          return userPermission.name === 'ticketing-admin';
        });
        if (dojoTicketingAdminPermissionFound) {
          seneca.act({role: 'cd-users', cmd: 'load', id: userDojo.userId, user: args.user}, function (err, admin) { return cb(err, sanitiseAdmin(admin)); });
        } else {
          return cb();
        }
      }, function (err, dojoTicketingAdmins) {
        if (err) return done(err);
        dojoTicketingAdmins = _.chain(dojoTicketingAdmins)
          .flatten()
          .compact()
          .value();
        return done(null, dojoTicketingAdmins);
      });
    });
  }

  function cmd_user_is_dojo_admin (args, done) {
    var seneca = this;
    var dojoId = args.dojoId || args.query.dojoId;
    var userId = args.user.id;

    async.waterfall([
      loadDojoAdmins,
      loadTicketingAdmins,
      userIsDojoAdmin
    ], done);

    function loadDojoAdmins (done) {
      seneca.act({role: plugin, cmd: 'load_dojo_admins', dojoId: dojoId}, done);
    }

    function loadTicketingAdmins (dojoAdmins, done) {
      seneca.act({role: plugin, cmd: 'load_ticketing_admins', dojoId: dojoId}, function (err, ticketingAdmins) {
        if (err) return done(null, {ok: false, why: err.message});
        return done(null, dojoAdmins, ticketingAdmins);
      });
    }

    function userIsDojoAdmin (dojoAdmins, ticketingAdmins, done) {
      var uniqueAdminIds = _.uniq(_.concat(_.uniq(_.map(dojoAdmins, 'id')), _.uniq(_.map(ticketingAdmins, 'id'))));

      var userIsDojoAdmin = uniqueAdminIds && _.indexOf(uniqueAdminIds, userId) > -1;
      return done(null, {userIsDojoAdmin: userIsDojoAdmin});
    }
  }

  function cmd_list_query (args, done) {
    logger.info({args: args}, 'cmd_list_query');
    var seneca = this;
    var query = args.query || {};
    delete query.filterInactiveDojos;
    var dojosEntity = seneca.make$(ENTITY_NS);
    if (!query.limit$) query.limit$ = 'NULL';
    dojosEntity.list$(query, done);
  }

  function cmd_search_nearest_dojos (args, done) {
    logger.info({args: args}, 'cmd_search_nearest_dojos');
    var localPgOptions = _.defaults({}, options.postgresql);
    localPgOptions.database = _.get(options, 'postgresql.name');
    localPgOptions.user = _.get(options, 'postgresql.username');

    var searchLat = args.query.lat;
    var searchLon = args.query.lon;

    var search = args.query.search || null;

    var psqlQuery;
    var psqlQueryVariables;

    if (search) {
      search = '%' + search + '%';
      psqlQuery = "SELECT *, earth_distance(ll_to_earth($1, $2), ll_to_earth((geo_point->'lat')::text::float8, (geo_point->'lon')::text::float8)) AS distance_from_search_location FROM cd_dojos WHERE stage != 4 AND verified != 0 AND deleted != 1 OR name ILIKE $3 ORDER BY distance_from_search_location ASC LIMIT 10";
      psqlQueryVariables = [searchLat, searchLon, search];
    } else {
      return done(null, []);
    }

    pg.connect(localPgOptions, function (err, client) {
      if (err) return done(err);
      client.query(psqlQuery, psqlQueryVariables, function (err, results) {
        if (err) return done(err);
        client.end();
        _.each(results.rows, function (dojo) {
          dojo.user_invites = purgeInviteEmails(dojo.user_invites);
          dojo = purgeEBFields(dojo);
        });
        return done(null, results.rows);
      });
    });
  }

  function cmd_search_bounding_box (args, done) {
    logger.info({args: args}, 'cmd_search_bounding_box');
    var localPgOptions = _.defaults({}, options.postgresql);
    localPgOptions.database = _.get(options, 'postgresql.name');
    localPgOptions.user = _.get(options, 'postgresql.username');

    var searchLat = args.query.lat;
    var searchLon = args.query.lon;
    var boundsRadius = args.query.radius;
    var search = args.query.search || null;

    var psqlQuery;
    var psqlQueryVariables;
    if (search) {
      search = '%' + search + '%';
      psqlQuery = "SELECT *, earth_distance(ll_to_earth($1, $2), ll_to_earth((geo_point->'lat')::text::float8, (geo_point->'lon')::text::float8)) AS distance_from_search_location FROM cd_dojos WHERE stage != 4 AND deleted != 1 AND verified != 0 AND (earth_box(ll_to_earth($1, $2), $3) @> ll_to_earth((geo_point->'lat')::text::float8, (geo_point->'lon')::text::float8) OR name ILIKE $4) ORDER BY distance_from_search_location ASC";
      psqlQueryVariables = [searchLat, searchLon, boundsRadius, search];
    } else {
      psqlQuery = "SELECT *, earth_distance(ll_to_earth($1, $2), ll_to_earth((geo_point->'lat')::text::float8, (geo_point->'lon')::text::float8)) AS distance_from_search_location FROM cd_dojos WHERE stage != 4 AND deleted != 1 AND verified != 0 AND earth_box(ll_to_earth($1, $2), $3) @> ll_to_earth((geo_point->'lat')::text::float8, (geo_point->'lon')::text::float8) ORDER BY distance_from_search_location ASC";
      psqlQueryVariables = [searchLat, searchLon, boundsRadius];
    }

    pg.connect(localPgOptions, function (err, client) {
      if (err) return done(err);
      client.query(psqlQuery, psqlQueryVariables, function (err, results) {
        if (err) return done(err);
        client.end();
        _.each(results.rows, function (dojo) {
          dojo.user_invites = purgeInviteEmails(dojo.user_invites);
          dojo = purgeEBFields(dojo);
        });
        return done(null, results.rows);
      });
    });
  }

  function cmd_load_dojo_email (args, done) {
    var seneca = this;
    var dojoId = args.dojoId;
    if (!dojoId) return done(null, {ok: false, why: 'args.dojoId is empty'});

    seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, dojo) {
      if (err) return done(null, {ok: false, why: err.message});
      var dojoEmail = dojo.email;
      if (!dojoEmail) {
        // If the dojo email is not set, retrieve the dojo owner's email.
        seneca.act({
          role: plugin,
          cmd: 'load_usersdojos',
          query: {dojoId: dojoId, owner: 1}
        }, function (err, usersDojos) {
          if (err) return done(null, {ok: false, why: err.message});
          var userDojo = usersDojos[0];
          if (userDojo) {
            seneca.act({role: 'cd-users', cmd: 'load', id: userDojo.userId, user: args.user}, function (err, user) {
              if (err) return done(null, {ok: false, why: err.message});
              dojoEmail = user.email;
              return done(null, {email: dojoEmail});
            });
          } else {
            return done(null, {ok: false, why: 'No email found for this Dojo'});
          }
        });
      } else {
        return done(null, {email: dojoEmail});
      }
    });
  }

  function cmd_notify_all_members (args, done) {
    //  TODO:40 enqueue this process
    var seneca = this;
    var dojoId = args.data.dojoId;
    var eventId = args.data.eventId;
    var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';
    var emailSubject = args.data.emailSubject;

    async.waterfall([
      getDojoUsers,
      checkEmail,
      getEvent,
      getDojo,
      sendEmails
    ], done);

    function getDojoUsers (done) {
      var query = {dojoId: dojoId};

      seneca.act({role: plugin, cmd: 'load_dojo_users', query: query}, function (err, response) {
        if (err) return done(err);
        done(null, response.response);
      });
    }

    function checkEmail (users, done) {
      async.map(users, function (user, callback) {
        if (_.isEmpty(user.email)) {
          seneca.act({role: 'cd-profiles', cmd: 'load_parents_for_user', userId: user.id, user: args.user}, function (err, parents) {
            if (err) return seneca.log.warn('No parent found for', user.id);
            //  TODO:80 handle multiple parents
            user.parent = parents[0];

            //  excluse this child if the parent email is already in the list, to avoid multiple emails
            if (_.some(users, {email: user.parent.email})) {
              user = void 0;
            }
            callback(null, user);
          });
        } else {
          callback(null, user);
        }
      },
      function (err, users) {
        if (err) done(err);
        done(null, _.pull(users, void 0));
      });
    }

    function getEvent (users, done) {
      seneca.act({role: 'cd-events', cmd: 'getEvent', id: eventId}, function (err, event) {
        if (err) return done(err);
        done(null, users, event);
      });
    }

    function getDojo (users, event, done) {
      seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, dojo) {
        if (err) return done(err);
        done(null, users, event, dojo);
      });
    }

    function sendEmails (users, event, dojo, done) {
      if (users) {
        var content = {
          link: protocol + '://' + zenHostname + '/dashboard/dojo/' + dojo.urlSlug,
          dojo: {
            name: dojo.name,
            email: dojo.email
          },
          event: {
            name: event.name
          },
          year: moment(new Date()).format('YYYY')
        };

        var code = '';
        var baseCode = '';
        if (event.type === 'recurring') {
          baseCode = 'notify-all-members-recurring-';
        } else {
          baseCode = 'notify-all-members-oneoff-';
          var startDateUtcOffset = moment(_.head(event.dates).startTime).utcOffset();
          var endDateUtcOffset = moment(_.head(event.dates).endTime).utcOffset();

          var startDate = moment.utc(_.head(event.dates).startTime).subtract(startDateUtcOffset, 'minutes').toDate();
          var endDate = moment.utc(_.head(event.dates).endTime).subtract(endDateUtcOffset, 'minutes').toDate();

          content.event.date = moment(startDate).format('Do MMMM YY') + ', ' +
            moment(startDate).format('HH:mm') + ' - ' +
            moment(endDate).format('HH:mm');
        }
        var locality = args.locality || 'en_US';

        _.forEach(users, function (user) {
          content.dojoMember = user.name;
          var email = user.email;
          code = baseCode;
          if (!_.isEmpty(user.parent) && !_.isEmpty(user.parent.email)) {
            email = user.parent.email;
            code = 'parents-' + baseCode;
            content.childrenName = user.name;
            content.dojoMember = user.parent.name;
          }
          if (!_.isEmpty(email)) {
            var payload = {replyTo: dojo.email, from: '"' + dojo.name + '" <' + dojo.email + '>', to: email,
              code: code, locality: locality, content: content, subject: emailSubject, subjectVariables: [dojo.name]};
            seneca.act({role: plugin, cmd: 'send_email', payload: _.cloneDeep(payload)});
          }
        });
        done();
      }
    }
  }

  // from countries service
  // TODO:0 : clear this up, it seems a good couple of those are unused from: code:262

  function cmd_reverse_geocode (args, done) {
    var coords = args.coords;

    geocoder.reverse(coords, function (err, res) {
      if (err) res.error = err;
      done(null, res);
    });
  }

  function cmd_countries_continents (args, done) {
    setImmediate(function () {
      done(null, countriesList);
    });
  }

  function cmd_list_countries (args, done) {
    function calculateContinent (alpha2) {
      return countriesList.countries && countriesList.countries[alpha2] ? countriesList.countries[alpha2].continent : null;
    }

    var transformed = _.chain(isoc)
      .filter('status', 'officially-assigned')
      .map(function (country) {
        return {
          countryName: country.name.short,
          countryNumber: country.numeric,
          continent: calculateContinent(country.alpha2),
          alpha2: country.alpha2,
          alpha3: country.alpha3
        };
      })
      .value();

    setImmediate(function () {
      return done(null, transformed);
    });
  }

  function cmd_list_places (args, done) {
    var options = {
      url: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      method: 'GET',
      headers: {'Referer': 'zen.coderdojo.com'},
      qs: {
        key: process.env.GOOGLE_MAPS_KEY,
        types: '(cities)',
        components: 'country:' + args.search.countryCode,
        input: args.search.search
      }
    };

    debug('cmd_list_places options:', options);
    request(options, function (error, response, data) {
      if (error) {
        return done(error);
      }
      if (data && data.error_message) {
        return done(new Error('Google Maps API error: ' + data.error_message));
      }

      var status = response.statusCode;

      if (status >= 400) {
        logger.error({time: new Date()}, data);
        return done(new Error('Got a ' + status + ' status code from the Google Maps API.'));
      }

      var places = _.chain(data.predictions)
        .map('description')
        .map(function (name) {
          var parts = name.split(',');
          if (parts.length === 1) {
            return name;
          }
          // Remove the country from the end of the string
          return parts.slice(0, -1).join(',');
        })
        .value();

      debug('cmd_list_places returning:', places);
      done(null, places);
    });
  }

  function cmd_continents_lat_long (args, done) {
    setImmediate(function () {
      done(null, continents.coordinatesByAlpha2);
    });
  }

  function cmd_countries_lat_long (args, done) {
    setImmediate(function () {
      done(null, countries.coordinatesByAlpha2);
    });
  }

  function cmd_get_continent_codes (args, done) {
    setImmediate(function () {
      done(null, continents.alpha2ByName);
    });
  }

  return {
    name: plugin
  };
};
