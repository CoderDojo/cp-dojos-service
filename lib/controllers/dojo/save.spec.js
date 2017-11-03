var config = require(__dirname + '/../../../config/config.js')();
var _ = require('lodash');
var async = require('async');
var logger = require('cp-logs-lib')({name: 'cd-dojos-service'}).logger;
delete config['postgresql-store'];
var seneca = require('seneca')(config);
var expect = require('chai').expect;
var mockSeneca = require(__dirname + '/../../../test/lib/mock.js')(seneca);
var lab = exports.lab = require('lab').script();

seneca
  .use(__dirname + '/../../../test/stubs/cd-user-profile.js')
  .use(__dirname + '/../../../test/stubs/cd-profiles.js')
  .use(__dirname + '/../../../test/stubs/cd-users.js')
  .use(__dirname + '/../../../test/stubs/cd-agreements.js')
  .use(__dirname + '/../../../test/stubs/cd-organisations.js')
  .use(__dirname + '/../../../test/stubs/email-notifications.js')
  .use(__dirname + '/../../../dojos.js', {limits: {maxUserDojos: 10}, shared: config.shared, logger: logger});

var leadStub = require('../../../test/fixtures/dojoleads.json')[0];
lab.experiment('save a dojo', function () {
  var dojo;
  var plugin = 'cd-dojos';
  var user = {id: 1000, roles: ['basic-user']};
  function setupDojo (done) {
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, {id: 1000});
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    mockSeneca({role: plugin, ctrl: 'notifications', channel: 'email', cmd: 'send'}, []);
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, savedLead) {
      savedLead.application.champion.isValid = true;
      savedLead.application.dojo.isValid = true;
      savedLead.application.venue.isValid = true;
      savedLead.application.team.isValid = true;
      savedLead.application.charter.isValid = true;
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'submit', lead: savedLead, user: user}, function (err, submittedLead) {
        mockSeneca({role: 'cd-profiles', cmd: 'list'}, [{id: 1000}]);
        mockSeneca({role: 'cd-user-profile', cmd: 'list'}, [{userId: 1000}]);
        seneca.act({role: plugin, ctrl: 'dojo', cmd: 'verify', verified: 1, id: submittedLead.application.dojo.id, user: {id: 42}},
        function (err, dojoCreated) {
          dojo = dojoCreated;
          done();
        });
      });
    });
  }
  lab.before(setupDojo);

  lab.test('the dojo should be saved', function (done) {
    seneca.act({role: plugin, entity: 'dojo', cmd: 'load', id: dojo.id}, function (err, ldojo) {
      var fields = _.keys(ldojo.data$());
      async.each(fields, function (field, eCb) {
        expect(ldojo[field]).to.equal(dojo[field]);
        eCb();
      }, done);
    });
  });

  lab.test('the fields should be sanitized', function (done) {
    var oldDojoName = dojo.name;
    dojo.name = dojo.name + '<script>alert(1)</script>';
    dojo.countryName = 'Italy<script>alert(1)</script>';
    dojo.notes = '<p>Sandwich !!!<script>alert(1)</script></p>';
    seneca.act({role: plugin, ctrl: 'dojo', cmd: 'save', dojo: dojo}, function (err, dojo) {
      expect(dojo.name).to.equal(oldDojoName);
      expect(dojo.notes).to.equal('<p>Sandwich !!!</p>');
      expect(dojo.countryName).to.equal('Italy');
      expect(dojo.urlSlug.indexOf('script')).to.equal(-1);
      done();
    });
  });
  // NOTE: This is only due to legacy codebase, frankly this should die.
  lab.test('the geolocation position should be normalized', function (done) {
    expect(dojo.geoPoint.lat).to.equal(dojo.coordinates[0]);
    expect(dojo.geoPoint.lon).to.equal(dojo.coordinates[1]);
    done();
  });
  lab.test('the slug should be recreated', function (done) {
    // TODO : admin1Name is not set ?
    // expect(dojo.slug.indexOf(dojo.admin1Name.toLowerCase())).to.gt(-1);
    expect(dojo.urlSlug.indexOf(dojo.alpha2.toLowerCase())).to.gt(-1);
    expect(dojo.urlSlug.indexOf(dojo.placeName.toLowerCase())).to.gt(-1);
    expect(dojo.urlSlug.indexOf(dojo.name.toLowerCase().replace(' ', '-'))).to.gt(-1);
    done();
  });
  lab.test('the slug should increment if a dojo already exists for the said location', function (done) {
    var otherDojo = _.cloneDeep(dojo);
    delete otherDojo.id;
    // in-memory store doesn't support Regex to match equivalent dojo 'slugs
    mockSeneca({role: plugin, entity: 'dojo', cmd: 'list'}, [{id: dojo.id, urlSlug: dojo.urlSlug}]);
    seneca.act({role: plugin, ctrl: 'dojo', cmd: 'save', dojo: otherDojo}, function (err, otherDojo) {
      // expect(otherDojo.slug.indexOf(dojo.admin1Name.toLowerCase())).to.gt(-1);
      expect(otherDojo.urlSlug).to.not.equal(dojo.urlSlug);
      expect(otherDojo.urlSlug.indexOf(dojo.alpha2.toLowerCase())).to.gt(-1);
      expect(otherDojo.urlSlug.indexOf(dojo.placeName.toLowerCase())).to.gt(-1);
      expect(otherDojo.urlSlug.indexOf(dojo.name.toLowerCase().replace(' ', '-'))).to.gt(-1);
      expect(otherDojo.urlSlug.substring(otherDojo.urlSlug.length - 2, otherDojo.urlSlug.length)).to.equal('-1');
      done();
    });
  });
  // TODO : test not changing upon equality
  lab.describe('the events should be update their address', function () {
    var l_dojo;
    lab.beforeEach(function (done) {
      seneca.make$('cd/dojoleads').remove$({all$: true}, function (err) {
        seneca.make$('cd/dojos').remove$({all$: true}, function (err) {
          setupDojo(function () {
            l_dojo = _.cloneDeep(dojo);
            mockSeneca({role: plugin, entity: 'dojo', cmd: 'load'}, dojo);
            done();
          });
        });
      });
    })
    lab.test('if the countryName changed', function (done) {
      l_dojo.country.alpha2 = 'FR';
      mockSeneca({role: plugin, entity: 'dojo', cmd: 'list'}, []);
      mockSeneca({role: 'cd-events', ctrl: 'events', cmd: 'updateAddress'}, function (args) {
        expect(args.dojoId).to.equal(dojo.id);
        expect(args.location.country.alpha2).to.eql('FR');
        done();
      });
      seneca.act({role: plugin, ctrl: 'dojo', cmd: 'save', dojo: l_dojo}, function (err, updatedDojo) {
        expect(dojo.id).to.eql(updatedDojo.id);
      });
    });
    lab.test('if the address changed', function (done) {
      l_dojo.address1 = 'My dear pub, bring me guiness';
      mockSeneca({role: plugin, entity: 'dojo', cmd: 'list'}, []);
      mockSeneca({role: 'cd-events', ctrl: 'events', cmd: 'updateAddress'}, function (args) {
        expect(args.dojoId).to.equal(dojo.id);
        expect(args.location.address).to.equal(l_dojo.address1);
        done();
      });
      seneca.act({role: plugin, ctrl: 'dojo', cmd: 'save', dojo: l_dojo}, function (err, updatedDojo) {
        expect(dojo.id).to.eql(updatedDojo.id);
      });
    });
    lab.test('if the place(city) changed', function (done) {
      l_dojo.place.placeName = 'Lyon';
      mockSeneca({role: plugin, entity: 'dojo', cmd: 'list'}, []);
      mockSeneca({role: 'cd-events', ctrl: 'events', cmd: 'updateAddress'}, function (args) {
        expect(args.dojoId).to.equal(dojo.id);
        expect(args.location.city).to.equal(l_dojo.place);
        done();
      });
      seneca.act({role: plugin, ctrl: 'dojo', cmd: 'save', dojo: l_dojo}, function (err, updatedDojo) {
        expect(dojo.id).to.eql(updatedDojo.id);
      });
    });
    lab.test('if the position changed', function (done) {
      l_dojo.geoPoint.lat = '42';
      mockSeneca({role: plugin, entity: 'dojo', cmd: 'list'}, []);
      mockSeneca({role: 'cd-events', ctrl: 'events', cmd: 'updateAddress'}, function (args) {
        expect(args.dojoId).to.equal(dojo.id);
        expect(args.location.position).to.equal(l_dojo.geoPoint);
        done();
      });
      seneca.act({role: plugin, ctrl: 'dojo', cmd: 'save', dojo: l_dojo}, function (err, updatedDojo) {
        expect(dojo.id).to.eql(updatedDojo.id);
      });
    });
    lab.test('NOT if nothing changed', function (done) {
      var called = false;
      mockSeneca({role: plugin, entity: 'dojo', cmd: 'list'}, [], true);
      mockSeneca({role: 'cd-events', ctrl: 'events', cmd: 'updateAddress'}, function (args) {
        called = true;
      });
      seneca.act({role: plugin, ctrl: 'dojo', cmd: 'save', dojo: l_dojo}, function (err, updatedDojo) {
        process.nextTick(function () {
          expect(called).to.be.false;
          done();
        });
      });
    });
  });
  lab.after(function (done) {
    seneca.close();
    done();
  });
});
