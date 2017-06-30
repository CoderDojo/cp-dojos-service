var config = require(__dirname + '/../../../config/config.js')();
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
delete leadStub.id; // TODO : this shouldn't happen, but id is dynamic anyway
lab.experiment('when transforming a submitted dojo into a dojo ready for validation', function () {
  var dojo;
  var preConfirmDojo = {};
  var plugin = 'cd-dojos';
  lab.before(function (done) {
    // Prepare a lead
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, {id: 1000});
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: {id: 1000}}, function (err, savedLead) {
      savedLead.application.champion.isValid = true;
      savedLead.application.dojo.isValid = true;
      savedLead.application.venue.isValid = true;
      savedLead.application.team.isValid = true;
      savedLead.application.charter.isValid = true;
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'submit', lead: savedLead, user: {id: 1000}}, function (err, submittedLead) {
        mockSeneca({role: 'cd-profiles', cmd: 'list'}, [{id:1000, children: [1100, 1200]}]);
        mockSeneca({role: 'cd-user-profile', cmd: 'list'}, [{userId: 1000, children: [1100, 1200]}]);
        mockSeneca({role: 'cd-profiles', cmd: 'list'}, [{id:1100, userType: 'attendee-o13'}]);
        mockSeneca({role: 'cd-profiles', cmd: 'list'}, [{id:1200, userType: 'attendee-u13'}]);
        preConfirmDojo = submittedLead.application.dojo;
        seneca.act({role: plugin, ctrl: 'dojo', cmd: 'verify', id: submittedLead.application.dojo.id, user: {id: 42}},
        function (err, dojoCreated) {
          dojo = dojoCreated;
          done();
        });
      });
    });
  });
  lab.after(function (done) {
    seneca.close();
    done();
  });

  lab.test('the creation info should be set', function (done) {
    var now = new Date();
    expect(dojo.verifiedAt.getDay()).to.equal(now.getDay());
    expect(dojo.verifiedAt.getHours()).to.equal(now.getHours());
    expect(dojo.verifiedAt.getMonth()).to.equal(now.getMonth());
    expect(dojo.verifiedAt.getYear()).to.equal(now.getYear());
    expect(dojo.verified).to.equal(1);
    expect(dojo.verifiedBy).to.equal(42);
    done();
  });
  lab.test('the creator should be set as a champion', function (done) {
    seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojo.id, userId: 1000}},
      function (err, champ) {
        expect(champ.length).to.equal(1);
        done();
    });
  });
  // Test fails when in a suite, works only on this file alone
  lab.test.skip('the user\'s kid should be added to the dojo', function (done) {
    // TODO : fix mem-store to support in$, gt$ and co
    seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojo.id, userId: 1100}},
    function (err, kids) {
      expect(kids.length).to.equal(1);
      seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojo.id, userId: 1200}},
      function (err, kids) {
        expect(kids.length).to.equal(1);
        done();
      });
    });
  });

  // TODO : Err : dojo not found test
  lab.test('the confirm action should be usable only once per dojo/lead', function (done) {
    seneca.act({role: plugin, ctrl: 'dojo', cmd: 'verify', id: preConfirmDojo.id}, function (err, dojo) {
      expect(err.orig.toString()).to.equal('Error: gate-executor: A dojo cannot be verified twice');
      done();
    });
  });
});
