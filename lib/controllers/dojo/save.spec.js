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
  lab.before(function (done) {
    // Save dojo
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, {id: 1000});
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: {id: 1000}}, function (err, savedLead) {
      savedLead.application.champion.isValid = true;
      savedLead.application.dojo.isValid = true;
      savedLead.application.venue.isValid = true;
      savedLead.application.team.isValid = true;
      savedLead.application.charter.isValid = true;
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'submit', lead: savedLead, user: {id: 1000}}, function (err, submittedLead) {
        mockSeneca({role: 'cd-profiles', cmd: 'list'}, [{id: 1000}]);
        mockSeneca({role: 'cd-user-profile', cmd: 'list'}, [{userId: 1000}]);
        seneca.act({role: plugin, ctrl: 'dojo', cmd: 'confirm', dojo: submittedLead.application.dojo, user: {id: 42}},
        function (err, dojoCreated) {
          dojo = dojoCreated;
          done();
        });
      });
    });
  });

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
  lab.after(function (done) {
    seneca.close();
    done();
  });
});
