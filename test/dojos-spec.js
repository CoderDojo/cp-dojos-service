'use strict';

var seneca = require('seneca')(),
  config = require(__dirname + '/../config/config.js')(),
  fs = require('fs'),
  pg = require('pg'),
  expect = require('chai').expect,
  util = require('util'),
  _ = require('lodash'),
  async = require('async'),
  sinon = require('sinon'),
  logger = require('cp-logs-lib')({name: 'cd-dojos-service'}).logger,
  lab = exports.lab = require('lab').script();

var role = "cd-dojos";

var users = require('./fixtures/users.json');
var dojos = require('./fixtures/dojos.json');
var dojoleads = require('./fixtures/dojoleads.json');
var usersDojos = require('./fixtures/usersdojos.json');
var polls = require('./fixtures/polls.json');
var pollsResults = require('./fixtures/polls_results.json');
var usersProfiles = require('./fixtures/users_profiles.json');

seneca.options(config);

seneca
  .use(__dirname + '/stubs/cd-agreements.js')
  .use(__dirname + '/stubs/cd-countries.js')
  .use(__dirname + '/stubs/cd-profiles.js')
  .use(__dirname + '/stubs/cd-users.js')
  .use(__dirname + '/stubs/cd-user-profile.js')
  .use(__dirname + '/stubs/email-notifications.js')
  .use(__dirname + '/../dojos.js', {limits: {maxUserDojos: 10}, shared: config.shared, logger: logger});

var usersEnt = seneca.make$("sys/user"),
  dojosEnt = seneca.make$("cd/dojos"),
  usersDojosEnt = seneca.make$("cd/usersdojos"),
  dojoLeadsEnt = seneca.make$("cd/dojoleads"),
  pollsEnt = seneca.make$("cd/polls"),
  pollsResultsEnt = seneca.make$("cd/polls_results");

// this is unusually necessary
// when interrupted, node doesn't stop without this
process.on('SIGINT', function () {
  process.exit(0);
});

(function mockPg() {
  var client = {query: _.noop, end: _.noop};
  sinon.mock(client).expects('query').atLeast(1).callsArgWith(2, null, {rows: []});
  sinon.mock(pg).expects('connect').atLeast(1).callsArgWith(1, null, client);
})();

function mockSeneca(role, cmd, result) {
  var called = false;
  seneca.add({role: role, cmd: cmd}, function (args, done) {
    if (called) return this.parent(args, done);
    called = true;
    done(null, result);
  });
}

function mockSenecaError(role, cmd) {
  var called = false;
  seneca.add({role: role, cmd: cmd}, function (args, done) {
    if (called) return this.parent(args, done);
    called = true;
    done(new Error('MOCK ERROR'));
  });
}

// NOTE: all tests are basic
//       they just follow the happy scenario for each exposed action

function create_dojo(obj, creator, done) {
  seneca.act({role: role, cmd: 'create', dojo: obj, user: {id: creator.id, roles: ['cdf-admin']}},
    function (err, savedDojo) {
      if (err) return done(err);
      expect(savedDojo.id).to.be.ok;
      done(null, savedDojo);
    });
}

function create_users_dojos(obj, done) {
  seneca.act({role: role, cmd: 'save_usersdojos', userDojo: obj, user: {roles: ['cdf-admin']}}, done);
}

function create_poll(obj, done) {
  seneca.act({role: role, cmd: 'save_poll_setup', poll: obj},
    function (err, savedPoll) {
      if (err) return done(err);

      expect(savedPoll.id).to.be.ok;

      done(null, savedPoll);
    });
}

function create_poll_answer(obj, done) {
  seneca.act({role: role, cmd: 'save_poll_result', poll: obj},
    function (err, savedPollResult) {
      if (err) return done(err);

      expect(savedPollResult.id).to.be.ok;

      done(null, savedPollResult);
    });
}

lab.experiment('Dojo Microservice test', function () {

  // Empty Tables
  lab.before(function (done) {
    dojosEnt.remove$({all$: true}, done);
  });

  lab.before(function (done) {
    usersEnt.remove$({all$: true}, done);
  });

  lab.before(function (done) {
    usersDojosEnt.remove$({all$: true}, done);
  });

  lab.before(function (done) {
    dojoLeadsEnt.remove$({all$: true}, done);
  });

  var loadUsers = function (user, cb) {
    usersEnt.save$(user, cb);
  };

  lab.before(function (done) {
    async.eachSeries(users, loadUsers, done);
  });

  lab.before(function (done) {
    seneca.util.recurse(4, function (index, next) {
      dojos[index].userId = users[index].id;
      dojos[index].created = new Date();
      dojos[index].creator = users[index].id;
      create_dojo(dojos[index], users[index], next);
    }, done);
  });

  lab.before(function (done) {
    seneca.util.recurse(2, function (index, next) {
      create_poll(polls[index], next);
    }, done);
  });

  lab.before(function (done) {
    seneca.util.recurse(pollsResults.length, function (index, next) {

      create_poll_answer(pollsResults[index], next);
    }, done);
  });

  lab.before(function (done) {
    async.eachSeries(usersDojos, function (item, callback) {

      dojosEnt.list$(function (err, dojos) {
        if (err) return done(err);
        item.dojoId = dojos[0].id;
        create_users_dojos(item, callback);
      });
    }, function (err) {
      if (err) return done(err);
      done();
    });
  });

  lab.experiment('Create', function () {
    lab.test('save dojo to db', function (done) {
      // TODO : refactor, creator shouldn't be set by anything but the process to upgrade a lead
      dojos[4].creator = users[4].id;
      dojos[4].created = new Date();
      create_dojo(dojos[4], users[4],
        function (err, savedDojo) {
          if (err) return done(err);
          dojosEnt.load$({creator: users[4].id}, function (err, loadedDojo) {
            if (err) return done(err);
            expect(dojos).not.to.be.empty;
            expect(loadedDojo).to.exist;
            expect(loadedDojo).to.be.ok;

            var expectedFields = ['admin1Code', 'admin1Name', 'alpha2', 'alpha3', 'continent',
              'coordinates', 'country', 'countryName', 'countryNumber',
              'county', 'deleted', 'email', 'location', 'mailingList',
              'mysqlDojoId', 'name', 'needMentors', 'notes', 'place',
              'placeGeonameId', 'placeName', 'private', 'state', 'time',
              'twitter', 'website', 'verified', 'stage', 'creator', 'created',
              'urlSlug', 'id'];
            var actualFields = Object.keys(loadedDojo);
            _.forEach(expectedFields, function (field) {
              expect(actualFields).to.include(field);
            })

            done();
          });
        });
    });
  });

  lab.experiment('Delete', function () {
    lab.test('delete dojo from db', {timeout: 20000}, function (done) {
      dojosEnt.list$({creator: users[0].id}, function (err, dojos) {

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        seneca.act({
          role: role,
          cmd: 'delete',
          dojo: dojos[0],
          dojoLeadId: 1000,
          user: {roles: ['cdf-admin']}
        }, function (err, output) {
          if (err) return done(err);
          dojosEnt.list$({id: dojos[0].id}, function (err, dojos) {
            if (err) return done(err);

            expect(dojos[0].deleted).to.equal(1);

            done();
          });
        });
      });
    });
  });

  lab.experiment('Update', function () {
    lab.test('update dojo field', function (done) {
      dojosEnt.list$({creator: users[3].id}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        var dojo = dojos[0];
        dojo.verified = 0;
        dojo.notes = "updated";
        seneca.act({role: role, cmd: 'update', dojo: dojo, user: {roles: ['cdf-admin']}}, function (err, updatedDojo) {
          if (err) return done(err);

          expect(updatedDojo.verified).to.be.equal(0);
          expect(updatedDojo.notes).to.be.equal("updated");
          done();
        });
      });
    });
    lab.test('update dojo field', function (done) {
      dojosEnt.list$({creator: users[3].id}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        var dojo = dojos[0];
        dojo.verified = 1;
        dojo.notes = "updated";

        seneca.act({role: role, cmd: 'update', dojo: dojo, user: {roles: ['cdf-admin']}}, function (err, updatedDojo) {
          if (err) return done(err);

          expect(updatedDojo.verified).to.be.equal(1);
          expect(updatedDojo.notes).to.be.equal("updated");
          done();
        });
      });
    });
    lab.test('update dojo field', function (done) {
      dojosEnt.list$({creator: users[3].id}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(1);
        expect(dojos[0]).to.be.ok;

        var dojo = dojos[0];
        dojo.verified = 0;
        dojo.notes = "updated";
        dojo.editDojoFlag = true;

        seneca.act({role: role, cmd: 'update', dojo: dojo, user: {roles: ['cdf-admin']}}, function (err, updatedDojo) {
          if (err) return done(err);

          expect(updatedDojo.notes).to.be.equal("updated");
          done();
        });
      });
    });
  });

  lab.experiment('My dojos', function () {
    lab.test.skip('list all dojos related to user', function (done) {
      seneca.act({role: role, cmd: 'my_dojos', user: users[0], search: {}}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.total).to.be.equal(1);
        expect(dojos.records[0]).to.be.ok;

        done();
      });
    });
  });

  lab.experiment('Dojos count (uses countries-stub)', function () {
    lab.test.skip('list dojos count per geographical location', function (done) {
      seneca.act({role: role, cmd: 'dojos_count'}, function (err, dojos) {
        if (err) return done(err);
        dojos = dojos.dojos;

        expect(dojos.continents).to.exist;
        expect(dojos.continents).to.include.keys(['EU', 'NA', 'SA']);
        expect(dojos.continents.EU.countries).to.include.keys(['RO', 'RU']);
        expect(dojos.continents.NA.countries).to.include.keys(['US']);
        expect(dojos.continents.SA.countries).to.include.keys(['BR']);

        var total = 0;
        _.forEach(dojos.continents, function (element) {
          expect(element.total).to.exist;
          total += element.total;
        });

        expect(total).to.be.equal(4);

        done();
      });
    });
  });

  lab.experiment('Dojos by country', function () {
    lab.test('sort dojos case-insensitively', function (done) {
      mockSeneca('cd-dojos', 'list', [
        {
          countryName: 'Ireland',
          name: 'Dublin'
        },
        {
          countryName: 'Ireland',
          name: 'athlone'
        }
      ]);
      seneca.act({role: role, cmd: 'dojos_by_country'}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos['Ireland'].length).to.be.equal(2);
        expect(dojos['Ireland'][0].name).to.be.equal('athlone');
        expect(dojos['Ireland'][1].name).to.be.equal('Dublin');

        done();
      });
    });

    lab.test.skip('list dojos by country', function (done) {
      seneca.act({role: role, cmd: 'dojos_by_country', countries: {US: '', BR: '', RO: ''}}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos.length).to.be.equal(3);
        expect(util.inspect(dojos).toString()).to.contain.any('America', 'Brazil', 'Romania');

        done();
      });
    });
  });

  lab.experiment('Dojos state count', function () {
    lab.test.skip('list dojos by states in country', function (done) {
      seneca.util.recurse(2, function (index, next) {
        dojos[4 + index].userId = users[index].userId;
        dojos[4 + index].created = new Date();
        dojos[4 + index].creator = users[index].userId;
        create_dojo(dojos[4 + index], users[index],
          function (err, dojo) {
            if (err) return done(err);
            expect(dojo).to.exist;
            next();
          });
      }, function (err, data) {

        seneca.act({role: role, cmd: 'dojos_state_count', country: 'UK'}, function (err, dojos) {
          if (err) return done(err);

          expect(dojos).to.exist;
          expect(dojos.UK).to.exist;
          expect(Object.keys(dojos.UK).length).to.equal(2);

          done();
        });
      });
    });
  });

  lab.experiment('Bulk update', function () {
    lab.test('update many dojos', function (done) {
      seneca.util.recurse(2, function (index, next) {
        create_dojo(dojos[4 + index], users[index],
          function (err, dojo) {
            if (err) return done(err);
            expect(dojo).to.exist;
            next();
          });
      }, function (err, data) {

        dojosEnt.list$({alpha2: 'UK'}, function (err, dojos) {
          if (err) return done(err);

          expect(dojos).not.to.be.empty;

          var value = 'updated.';
          _.forEach(dojos, function (element) {
            element.verified = 0;
            element.notes = value;
          });

          seneca.act({
            role: role,
            cmd: 'bulk_update',
            dojos: dojos,
            user: {roles: ['cdf-admin']}
          }, function (err, dojos) {
            if (err) return done(err);

            dojosEnt.list$({alpha2: 'UK'}, function (err, dojos) {
              if (err) return done(err);
              expect(dojos).not.to.be.empty;

              _.forEach(dojos, function (element) {
                expect(element.notes).to.equal(value);
              });

              done();
            });
          });
        });
      });
    });
  });

  lab.experiment('Bulk delete', function () {
    lab.test.skip('delete many dojos', function (done) {
      dojosEnt.list$({alpha2: 'UK'}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).not.to.be.empty;

        seneca.act({role: role, cmd: 'bulk_delete', dojos: dojos, user: {roles: ['cdf-admin']}}, function (err, dojos) {
          if (err) return done(err);

          dojosEnt.list$({alpha2: 'UK'}, function (err, dojos) {
            if (err) return done(err);

            expect(dojos).to.be.empty;

            done();
          });
        });
      });
    });
  });

  lab.experiment('Get stats', function () {

    lab.test.skip('list each dojo stats', function (done) {

      seneca.act({role: role, cmd: 'get_stats'}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).not.to.be.empty;
        expect(dojos.EU).to.exist;
        expect(dojos.EU.length).to.equal(2);
        expect(dojos.EU.toString()).to.contain.all('Romania', 'Russia');
        expect(dojos.NA).to.exist;
        expect(dojos.NA.length).to.equal(1);
        expect(dojos.NA.toString()).to.contain('America');
        expect(dojos.SA).to.exist;
        expect(dojos.SA.length).to.equal(1);
        expect(dojos.SA.toString()).to.contain('Brazil');

        done();
      });
    });
  });


  // Doesn't make any sense, jack shit test
  lab.experiment.skip('Load users dojos', function () {
    lab.test('load usersDojo based on query', function (done) {
      seneca.util.recurse(2, function (index, next) {
        dojos[4 + index].userId = users[index].userId;
        dojos[4 + index].creator = users[index].userId;
        dojos[4 + index].created = new Date();
        create_dojo(dojos[4 + index], users[index],
          function (err, dojo) {
            if (err) return done(err);
            expect(dojo).to.exist;
            next();
          });
      }, function (err, data) {

        usersDojosEnt.list$(function (err, dojos) {

          expect(dojos).not.to.be.empty;
          expect(dojos[0].id).to.be.ok;
          // there should be two usersDojos with userId 1001
          seneca.act({role: role, cmd: 'load_usersdojos', query: {userId: dojos[1].userId}},
            function (err, loadedDojos) {
              if (err) return done(err);

              expect(loadedDojos).to.exist;
              expect(loadedDojos.length).to.equal(2); //cause one of them is deleted during tests
              expect(loadedDojos[0].userId).to.be.ok;
              expect(loadedDojos[1].userId).to.be.ok;
              expect(loadedDojos[0].userId).to.equal(loadedDojos[1].userId);

              done();
            });
        });
      });
    });
  });

  lab.experiment('create_dojo_email', function () {
    lab.test('requires dojo arg', function (done) {
      seneca.act({role: role, cmd: 'create_dojo_email'}, function (err) {
        expect(err.message.indexOf('Dojo data is missing..') >= 0).to.be.ok;
        done();
      });
    });
  });

  lab.experiment('update_founder', function () {
    lab.test('requires founder arg', function (done) {
      seneca.act({role: role, cmd: 'update_founder'}, function (err) {
        expect(err.message.indexOf('Founder is empty') >= 0).to.be.ok;
        done();
      });
    });

    lab.test('requires cdf-admin user role', function (done) {
      seneca.act({role: role, cmd: 'update_founder', user: {}, founder: {dojoId: 'x'}}, function (err) {
        expect(err.message.indexOf('Unauthorized') >= 0).to.be.ok;
        done();
      });
    });

    lab.test('requires previous founder', function (done) {
      mockSeneca('cd-users', 'load', {roles: ['cdf-admin']});
      seneca.act({role: role, cmd: 'update_founder', user: {}, founder: {dojoId: 'x'}}, function (err) {
        expect(err.message.indexOf('Cannot find previous founder') >= 0).to.be.ok;
        done();
      });
    });

    lab.test('executes', function (done) {
      mockSeneca('cd-users', 'load', {roles: ['cdf-admin']});
      mockSeneca('cd-dojos', 'load_usersdojos', [{id: 'y'}]);
      seneca.act({role: role, cmd: 'update_founder', user: {}, founder: {dojoId: 'x'}}, done);
    });

    lab.test('handles error in cd-users/load', function (done) {
      mockSenecaError('cd-users', 'load');
      seneca.act({role: role, cmd: 'update_founder', user: {}, founder: {dojoId: 'x'}}, function (err) {
        expect(err.message.indexOf('MOCK ERROR') >= 0).to.be.ok;
        done();
      });
    });

    lab.test('handles error in cd-dojos/load_usersdojos for previous founder', function (done) {
      mockSeneca('cd-users', 'load', {roles: ['cdf-admin']});
      mockSenecaError('cd-dojos', 'load_usersdojos');
      seneca.act({role: role, cmd: 'update_founder', user: {}, founder: {dojoId: 'x'}}, function (err) {
        expect(err.message.indexOf('MOCK ERROR') >= 0).to.be.ok;
        done();
      });
    });

    lab.test('handles error in cd-dojos/load_usersdojos for current founder', function (done) {
      mockSenecaError('cd-dojos', 'load_usersdojos');
      mockSeneca('cd-users', 'load', {roles: ['cdf-admin']});
      mockSeneca('cd-dojos', 'load_usersdojos', [{id: 'y'}]);
      mockSeneca('cd-dojos', 'save_usersdojos', {id: 'y'});

      seneca.act({role: role, cmd: 'update_founder', user: {}, founder: {dojoId: 'x'}}, function (err) {
        expect(err.message.indexOf('MOCK ERROR') >= 0).to.be.ok;
        done();
      });
    });
  });


  lab.experiment('savePoll', function () {
    lab.test('save poll to db', function (done) {
      dojosEnt.list$({}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos[0]).to.be.ok;

        var dojo = dojos[0];
        var poll = polls[0];
        poll.dojoId = dojo.id;
        create_poll(poll, function (err, savedPoll) {
          if (err) return done(err);

          pollsEnt.load$({id: savedPoll.id}, function (err, loadedPoll) {
            if (err) return done(err);
            expect(loadedPoll).not.to.be.empty;

            var expectedFields = ['question', 'valueUnity', 'maxAnswers', 'endDate', 'dojoId', 'id'];
            var actualFields = Object.keys(loadedPoll);
            _.forEach(expectedFields, function (field) {
              expect(actualFields).to.include(field);
            })
            done();
          });
        });
      });
    });
  });

  lab.experiment('savePollResult', function () {
    lab.test('save pollResult to db', function (done) {
      dojosEnt.list$({creator: users[3].id}, function (err, dojos) {
        if (err) return done(err);

        expect(dojos).to.exist;
        expect(dojos[0]).to.be.ok;

        var dojo = dojos[0];
        pollsEnt.list$({}, function (err, polls) {
          if (err) return done(err);

          expect(polls).to.exist;
          expect(polls.length).to.be.equal(2);
          expect(polls[0]).to.be.ok;

          var poll = polls[0];
          var pollResult = pollsResults[0];
          pollResult.dojoId = dojo.id;
          pollResult.pollId = poll.id;
          create_poll_answer(pollResult, function (err, savedPollResult) {
            if (err) return done(err);

            pollsResultsEnt.load$({id: savedPollResult.id}, function (err, loadedPollResult) {
              if (err) return done(err);
              expect(loadedPollResult).not.to.be.empty;

              var expectedFields = ['pollId', 'dojoId', 'createdAt', 'value', 'id'];
              var actualFields = Object.keys(loadedPollResult);
              _.forEach(expectedFields, function (field) {
                expect(actualFields).to.include(field);
              });
              done();
            });
          });
        });
      });
    });
  });

  lab.experiment('pollCount', function () {
    lab.test('get poll sum of value', function (done) {
      pollsEnt.list$({}, function (err, polls) {
        if (err) return done(err);

        expect(polls).to.exist;
        expect(polls.length).to.be.equal(2);
        expect(polls[0]).to.be.ok;
        var poll = polls[1];
        var pollResult = pollsResults[0];
        pollResult.pollId = poll.id;
        seneca.act({role: role, cmd: 'poll_count', pollId: poll.id}, function (err, sumPollResult) {
          if (err) return done(err);
          expect(sumPollResult).not.to.be.empty;

          var expectedFields = ['count'];
          var actualFields = Object.keys(sumPollResult);
          _.forEach(expectedFields, function (field) {
            expect(actualFields).to.include(field);
          });
          done();
        });
      });
    });
  });

});
