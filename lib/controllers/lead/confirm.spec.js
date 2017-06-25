var config = require(__dirname + '/../../../config/config.js')();
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
delete leadStub.id; // TODO : this shouldn't happen, but id is dynamic anyway

lab.experiment.skip('When confirming a lead, ', function () {
  var res;
  var plugin = 'cd-dojos';
  var user = {id: 1000};
  lab.before(function (done) {
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    async.series([
      function (sCb) {
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, lead) {
          if (err) return done(err);
          leadStub = lead;
          sCb();
        });
      },
      function (sCb) {
        mockSeneca({role: 'cd-profiles', cmd: 'list'}, [user]);
        mockSeneca({role: 'cd-user-profile', cmd: 'list'}, [user]);
        seneca.act({role: plugin, ctrl: 'lead', cmd: 'confirm', lead: leadStub, user: user}, function (err, result) {
          if (err) return done(err);
          res = result;
          sCb();
        });
      }
    ], done);
  });
  lab.test('it should save the lead', function (done) {
    expect(res.id).to.exists;
    done();
  });
  lab.test('it should confirm the dojo', function (done) {
    expect(res.application.dojo.id).to.exists;
    done();
  });
  lab.test('it should mark the lead as completed', function (done) {
    expect(res.completed).to.be.true;
    done();
  });
  lab.test('it should return a lead', function (done) {
    expect(Object.keys(res)).to.eql(Object.keys(leadStub));
    done();
  });
});
