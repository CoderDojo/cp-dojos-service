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

lab.experiment('Lead/Submit', function () {
  var plugin = 'cd-dojos';
  lab.afterEach(function (done) {
    var entLeads = seneca.make$('cd/dojoleads');
    entLeads.remove$({all$: true});
    var entDojos = seneca.make$('cd/dojos');
    entDojos.remove$({all$: true});
    done();
  });

  lab.test('should refuse an incomplete lead', function (done) {
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, {id: 1000});
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: {id: 1000}}, function (err, _savedLead) {
      _savedLead.application.champion.isValid = true;
      _savedLead.application.dojo.isValid = true;
      _savedLead.application.venue.isValid = true;
      _savedLead.application.charter.isValid = false;
      _savedLead.application.team.isValid = false;
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'submit', lead: _savedLead, user: {id: 1000}}, function (err, lead) {
        expect(err.orig.toString()).to.equal('Error: gate-executor: Incomplete application');
        done();
      });
    });
  });
  lab.experiment('setLeadCompleted', function () {
    lab.test('should save the lead as completed', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, {id: 1000});
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: {id: 1000}}, function (err, _savedLead) {
        _savedLead.application.champion.isValid = true;
        _savedLead.application.dojo.isValid = true;
        _savedLead.application.venue.isValid = true;
        _savedLead.application.charter.isValid = true;
        _savedLead.application.team.isValid = true;
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'submit', lead: _savedLead, user: {id: 1000}}, function (err, lead) {
          seneca.act({role: plugin, entity: 'lead', cmd: 'load', id: _savedLead.id}, function (err, lead) {
            expect(lead.completed).to.be.true;
            done();
          });
        });
      });
    });
  });
  lab.experiment('submitDojo', function () {
    lab.test('should submit the dojo', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, {id: 1000});
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: {id: 1000}}, function (err, _savedLead) {
        _savedLead.application.champion.isValid = true;
        _savedLead.application.dojo.isValid = true;
        _savedLead.application.venue.isValid = true;
        _savedLead.application.charter.isValid = true;
        _savedLead.application.team.isValid = true;
        mockSeneca({role: plugin, ctrl: 'notifications', channel: 'email', cmd: 'send'}, []);
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'submit', lead: _savedLead, user: {id: 1000}}, function (err, lead) {
          expect(lead.application.dojo).to.exists;
          expect(lead.application.dojo.verified).to.equal(0);
          expect(lead.application.dojo.deleted).to.equal(0);
          done();
        });
      });
    });
  });
  lab.experiment('notifyCDF', function () {
    lab.test('should notify CDF', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, {id: 1000});
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: {id: 1000}}, function (err, _savedLead) {
        _savedLead.application.champion.isValid = true;
        _savedLead.application.dojo.isValid = true;
        _savedLead.application.venue.isValid = true;
        _savedLead.application.charter.isValid = true;
        _savedLead.application.team.isValid = true;
        // TODO: to have been called
        mockSeneca({role: plugin, ctrl: 'notifications', channel: 'email', cmd: 'send'}, []);
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'submit', lead: _savedLead, user: {id: 1000}}, function (err, lead) {
          expect(lead.application.dojo).to.exists;
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
