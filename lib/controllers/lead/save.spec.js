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
lab.experiment('When trying to confirm an invalid lead', function () {
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
  // Avoid usurpation/workflow replay
  lab.test('should stop you from changing a dojoId', function (done) {
    var lead = _.cloneDeep(leadStub);
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, savedLead) {
      if (err) return done(err);
      expect(savedLead.application.dojo.id).to.exists;
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      var falsyLead = _.cloneDeep(savedLead);
      falsyLead.application.dojo.id = 'nanannaBATMAN';
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: falsyLead, user: user}, function (err, invalidLead) {
        expect(err).to.exists;
        expect(err.orig.toString()).to.equal('Error: gate-executor: You cannot change the lead dojo of an application');
        done();
      });
    });
  });
  lab.test('should stop you from changing a creatorId', function (done) {
    var lead = _.cloneDeep(leadStub);
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: lead, user: user}, function (err, savedLead) {
      if (err) return done(err);
      expect(savedLead.application.champion.id).to.exists;
      mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
      mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
      var falsyLead = _.cloneDeep(savedLead);
      falsyLead.userId = 'imBATMAN';
      seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: falsyLead, user: user}, function (err, invalidLead) {
        expect(err).to.exists;
        expect(err.orig.toString()).to.equal('Error: gate-executor: You cannot change the lead user of an application');
        done();
      });
    });
  });
})


lab.experiment('When confirming a lead, ', function () {
  var res;

  lab.afterEach(function (done) {
    var entLeads = seneca.make$('cd/dojoleads');
    entLeads.remove$({all$: true}, done);
    var entDojos = seneca.make$('cd/dojos');
    entDojos.remove$({all$: true}, done);
  });
  // Limit dojo creation

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
  lab.test('shouldn\'t let you update somebody else profile, even as CDF', function (done) {

  })
  // it('should only mutate field from the application')
  //
  // it('should get the charter status')
  // it('should update the dojo and assign the leadId')
  // it('should work even if the charter or the dojo are not defined')
  //
  // it('should save all relational ids to the lead object', function () {
  //   expect(returned.id).to.exists;
  //   expect(returned.application.dojo.id).to.exists;
  //   expect(returned.application.charter.id).to.exists;
  //   expect(returned.application.champion.id).to.exists;
  // })
});
