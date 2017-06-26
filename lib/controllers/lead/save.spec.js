var config = require(__dirname + '/../../../config/config.js')();
var async = require('async');
var _ = require('lodash');
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
var plugin = 'cd-dojos';
var user = {id: 1000};
lab.experiment('Lead/Save', function () {
  lab.experiment('limitConcurrentLead', function () {
    lab.test('should not let you save if you already have an application awaiting approval', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      // Note: mock on a same microservice than the one tested seems not to work
      // mockSeneca({role: 'cd-dojos', entity: 'lead', cmd: 'list'}, [{id: 1100}]);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function () {
        mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
        mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
        mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, []);
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, lead) {
          expect(err).to.exists;
          expect(err.orig.toString()).to.eql('Error: gate-executor: Cannot start a dojo while another is awaiting approval');
          done();
        });
      });
    });
    lab.test('should let you continue if it\'s your first time', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, lead) {
        if (err) return done(err);
        expect(lead.id).to.exists;
        done();
      });
    });
    lab.test('should let you continue if you\'re part of a company', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      // Note: mock on a same microservice than the one tested seems not to work
      // mockSeneca({role: 'cd-dojos', entity: 'lead', cmd: 'list'}, [{id: 1100}]);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function () {
        mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
        mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
        mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, lead) {
          expect(err).to.not.exists;
          expect(lead.id).to.exists;
          done();
        });
      });
    });
  });
  lab.experiment('securityChecks', function () {
    lab.beforeEach(function (done) {
      var entLeads = seneca.make$('cd/dojoleads');
      entLeads.remove$({all$: true});
      var entDojos = seneca.make$('cd/dojos');
      entDojos.remove$({all$: true});
      done();
    });
    // Avoid usurpation/workflow replay
    lab.test('should stop you from changing a dojoId', function (done) {
      var lead = _.cloneDeep(leadStub);
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, savedLead) {
        if (err) return done(err);
        expect(savedLead.application.dojo.id).to.exists;
        mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
        mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
        mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
        var falsyLead = _.cloneDeep(savedLead);
        falsyLead.application.dojo.id = 'nanannaBATMAN';
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: falsyLead, user: user}, function (err, invalidLead) {
          expect(err).to.exists;
          expect(err.orig.toString()).to.equal('Error: gate-executor: You cannot change the lead dojo of an application');
          done();
        });
      });
    });
    lab.test('should stop you from changing the lead userId', function (done) {
      var lead = _.cloneDeep(leadStub);
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, savedLead) {
        if (err) return done(err);
        expect(savedLead.application.champion.id).to.exists;
        mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
        mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
        mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
        var falsyLead = _.cloneDeep(savedLead);
        falsyLead.userId = 'imBATMAN';
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: falsyLead, user: user}, function (err, invalidLead) {
          expect(err).to.exists;
          expect(err.orig.toString()).to.equal('Error: gate-executor: You cannot change the lead user of an application');
          done();
        });
      });
    });
    lab.test('should stop you from changing the champion id', function (done) {
      var lead = _.cloneDeep(leadStub);
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, savedLead) {
        if (err) return done(err);
        expect(savedLead.application.champion.id).to.exists;
        mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
        mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
        mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, [{userId: 1000, orgId: 100}]);
        var falsyLead = _.cloneDeep(savedLead);
        falsyLead.application.champion.id = 'imBATMAN!!';
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: falsyLead, user: user}, function (err, invalidLead) {
          expect(err).to.exists;
          expect(err.orig.toString()).to.equal('Error: gate-executor: Champion Id doesn\'t match userId');
          done();
        });
      });
    });
  });


    // Limit dojo creation
  lab.experiment('saveLead', function () {
    lab.beforeEach(function (done) {
      var entLeads = seneca.make$('cd/dojoleads');
      entLeads.remove$({all$: true});
      var entDojos = seneca.make$('cd/dojos');
      entDojos.remove$({all$: true});
      done();
    });
    lab.test('should remove any mark of completion', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, lead) {
        if (err) return done(err);
        expect(lead.completed).to.be.false;
        done();
      });
    });
    // Lead saving
    lab.test('should save a lead and obtain an id', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, lead) {
        if (err) return done(err);
        expect(lead.id).to.exists;
        done();
      });
    });
  });
  lab.experiment('updateChampionProfile', function () {
    lab.beforeEach(function (done) {
      var entLeads = seneca.make$('cd/dojoleads');
      entLeads.remove$({all$: true});
      var entDojos = seneca.make$('cd/dojos');
      entDojos.remove$({all$: true});
      done();
    });
    lab.test('should update the owner profile', function (done) {
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});

      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, lead) {
        if (err) return done(err);
        seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', id: lead.application.champion.id}, function (err, champ) {
          if (err) return done(err);
          expect(lead.application.champion.name).to.equal(champ.name);
          done();
        });
      });
    });
  });
  lab.experiment('updateDojo', function () {
    lab.beforeEach(function (done) {
      var entLeads = seneca.make$('cd/dojoleads');
      entLeads.remove$({all$: true});
      var entDojos = seneca.make$('cd/dojos');
      entDojos.remove$({all$: true});
      done();
    });
    lab.test('shouldnt allow a verified dojo to save through a lead', function (done) {
      var lead = _.cloneDeep(leadStub);
      lead.application.dojo.id = 1000;
      seneca.act({role: 'cd-dojos', entity: 'dojo', cmd: 'save', dojo: {id: 1000, website: 'http://google.com', verified: true}}, function () {
        mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
        mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
        mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, []);
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, savedLead) {
          expect(err.orig.toString()).to.equal('Error: gate-executor: Cannot update a verified/deleted dojo through lead');
          done();
        });
      });
    });
    lab.test('shouldnt allow a verified dojo to save through a lead', function (done) {
      var lead = _.cloneDeep(leadStub);
      lead.application.dojo.id = 1000;
      seneca.act({role: 'cd-dojos', entity: 'dojo', cmd: 'save', dojo: {id: 1000, website: 'http://google.com', verified: true}}, function () {
        mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
        mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
        mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, []);
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, savedLead) {
          expect(err.orig.toString()).to.equal('Error: gate-executor: Cannot update a verified/deleted dojo through lead');
          done();
        });
      });
    });
  });
  lab.experiment('saveDojo', function () {
    var savedLead, dojo;
    var lead = _.cloneDeep(leadStub);
    leadStub.application.dojo.verified = 1;
    lab.before(function (done) {
      var entLeads = seneca.make$('cd/dojoleads');
      entLeads.remove$({all$: true});
      var entDojos = seneca.make$('cd/dojos');
      entDojos.remove$({all$: true});
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, []);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, _savedLead) {
        savedLead = _savedLead;
        seneca.act({role: plugin, entity: 'dojo', cmd: 'load', id: savedLead.application.dojo.id}, function (err, _dojo) {
          dojo = _dojo;
        });
        done();
      });
    });
    lab.test('should assign flat fields', function (done) {
      // name, countryName, notes,
      expect(savedLead.application.dojo.id).to.exists;
      expect(savedLead.application.dojo.name).to.equal(lead.application.dojo.name);
      expect(dojo.id).to.equal(savedLead.application.dojo.id);
      expect(dojo.name).to.equal(lead.application.dojo.name);
      expect(dojo.dojoLeadId).to.equal(savedLead.id);
      done();
    });
    lab.test('should force verified to 0', function (done) {
      expect(dojo.verified).to.equal(0);
      done();
    });
    lab.test('should assign venue', function (done) {
      expect(dojo.geoPoint).to.eql(lead.application.venue.geoPoint);
      // We don't test coordinates as they are rebuilt from save dojo ctrl
      expect(dojo.state).to.equal(lead.application.venue.state);
      expect(dojo.country).to.eql(lead.application.venue.country);
      expect(dojo.county).to.equal(lead.application.venue.county);
      expect(dojo.alpha2).to.equal(lead.application.venue.country.alpha2);
      expect(dojo.alpha3).to.equal(lead.application.venue.country.alpha3);
      expect(dojo.countryName).to.equal(lead.application.venue.country.countryName);
      expect(dojo.countryNumber).to.equal(lead.application.venue.country.countryNumber);
      expect(dojo.address1).to.equal(lead.application.venue.address1);
      expect(dojo.address2).to.equal(lead.application.venue.address2);
      expect(dojo.place).to.eql(lead.application.venue.place);
      expect(dojo.placeName).to.equal((lead.application.venue.place.nameWithHierarchy || lead.application.venue.place.toponymName));
      done();
    });
  });
  lab.experiment('handleCharter', function () {
    lab.beforeEach(function (done) {
      var entLeads = seneca.make$('cd/dojoleads');
      entLeads.remove$({all$: true});
      var entDojos = seneca.make$('cd/dojos');
      entDojos.remove$({all$: true});
      done();
    });
    lab.test('should not touch the signed charter if the charter already exists', function (done) {
      var lead = _.cloneDeep(leadStub);
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, []);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, _savedLead) {
        expect(_savedLead.application.charter.id).to.equal(lead.application.charter.id);
        expect(_savedLead.application.charter.fullName).to.equal(lead.application.charter.fullName);
        done();
      });
    });
    lab.test('should save the charter if it\'s new', function (done) {
      var lead = _.cloneDeep(leadStub);
      delete lead.application.charter.id;
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, []);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, _savedLead) {
        expect(_savedLead.application.charter.id).to.exists;
        expect(_savedLead.application.charter.fullName).to.equal(lead.application.charter.fullName);
        done();
      });
    });
  });
  lab.experiment('saveLead', function () {
    lab.beforeEach(function (done) {
      var entLeads = seneca.make$('cd/dojoleads');
      entLeads.remove$({all$: true});
      var entDojos = seneca.make$('cd/dojos');
      entDojos.remove$({all$: true});
      done();
    });
    lab.test('should save all relational ids to the lead object', function (done) {
      var lead = _.cloneDeep(leadStub);
      delete lead.application.charter.id;
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      mockSeneca({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list'}, []);
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, _savedLead) {
        expect(_savedLead.id).to.exists;
        expect(_savedLead.application.dojo.id).to.exists;
        expect(_savedLead.application.charter.id).to.exists;
        expect(_savedLead.application.champion.id).to.exists;
        done();
      });
    });
  });
});
