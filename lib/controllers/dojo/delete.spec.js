var config = require(__dirname + '/../../../config/config.js')();
var _ = require('lodash');
var async = require('async');
var logger = require('cp-logs-lib')({name: 'cd-dojos-service'}).logger;
delete config['postgresql-store'];
var seneca = require('seneca')(config);
var chai = require('chai');
chai.use(require('chai-moment'));
var expect = chai.expect;
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
lab.experiment('delete a dojo and its relationships', function () {
  var dojo;
  var plugin = 'cd-dojos';
  // We setup a dojo
  lab.before(function (done) {
    // Update user profile with champ info
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
        seneca.act({role: plugin, ctrl: 'dojo', cmd: 'verify', id: submittedLead.application.dojo.id, user: {id: 42}},
        function (err, dojoCreated) {
          dojo = dojoCreated;
          seneca.act({role: plugin, ctrl: 'dojo', cmd: 'delete', dojo: dojo, user: {id: 42}});
          done();
        });
      });
    });
  });

  lab.after(function (done) {
    done();
    seneca.close();
  });

  lab.test('the dojo should be soft deleted', function (done) {
    seneca.act({role: 'cd-dojos', cmd: 'load', id: dojo.id}, function (err, deletedDojo) {
      expect(deletedDojo.deleted).to.equal(1);
      expect(deletedDojo.deletedBy).to.equal(42);
      expect(deletedDojo.deletedAt).to.be.sameMoment(new Date(), 'minute');
      done();
    });
  });
  lab.test('only fields relative to deletion should be touched', function (done) {
    seneca.act({role: 'cd-dojos', cmd: 'load', id: dojo.id}, function (err, deletedDojo) {
      var fields = _.filter(_.keys(deletedDojo.data$()),
        function (fieldName) {
          var forbidden = ['deleted', 'deletedBy', 'deletedAt']; return forbidden.indexOf(fieldName) === -1;
      });
      async.each(fields, function (fieldName, next) {
        expect(deletedDojo[fieldName]).to.equal(dojo[fieldName]);
        next();
      }, done);
    });
  });
  lab.test('the lead should be soft deleted', function (done) {
    seneca.act({role: 'cd-dojos', entity: 'lead', cmd: 'load', id: dojo.dojoLeadId, user: {id: 42}}, function (err, deletedLead) {
      expect(deletedLead.id).to.equal(dojo.dojoLeadId); // Check if it's an update, not a new creation
      expect(deletedLead.deleted).to.equal(1);
      expect(deletedLead.deletedBy).to.equal(42);
      expect(deletedLead.deletedAt).to.be.sameMoment(new Date(), 'minute');
      done();
    });
  });
  lab.test('the users should be soft deleted', function (done) {
    seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: dojo.id}}, function (err, members) {
      async.each(members, function (member, eCb) {
        expect(member.deleted).to.equal(1);
        expect(member.deletedBy).to.equal(42);
        expect(member.deletedAt).to.be.sameMoment(new Date(), 'minute');
        eCb();
      }, done);
    });
  });
});
