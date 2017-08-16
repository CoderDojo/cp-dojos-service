var seneca = require('seneca')(),
  config = require(__dirname + '/../../../config/config.js')(),
  expect = require('chai').expect,
  lab = exports.lab = require('lab').script();
seneca.options(config);
var mockSeneca = require(__dirname + '/../../../test/lib/mock.js')(seneca);
var cleanLeadStep = require(__dirname + '/../../utils/dojo/lead/cleanLeadStep');

seneca
  .use(__dirname + '/../../../test/stubs/cd-profiles.js')
  .use(__dirname + '/../../../test/stubs/cd-agreements.js')
  .use(__dirname + '/../../../test/stubs/cd-organisations.js')
  .use(__dirname + '/../../../test/stubs/email-notifications.js')
  .use(__dirname + '/../../../dojos.js', {limits: {maxUserDojos: 10}, shared: config.shared});

var leadStub = require('../../../test/fixtures/dojoleads.json')[0];

lab.experiment('submit a dojo lead to review', function () {
  var dojo;
  var plugin = 'cd-dojos';
  var user = {id: 1000, name: 'champ1', email: 'champion1@example.com'};
  var sent = false;
  lab.before(function (done) {
    mockSeneca({role: 'cd-profiles', cmd: 'load_user_profile'}, user);
    mockSeneca({role: 'cd-agreements', cmd: 'getVersion'}, {version: 2});
    seneca.act({role: plugin, ctrl: 'lead', cmd: 'save', lead: leadStub, user: user}, function (err, savedLead) {
      dojo = cleanLeadStep(savedLead.application.dojo);
      mockSeneca({role: plugin, ctrl: 'notifications', channel: 'email', cmd: 'send'}, function (cb) {
        sent = true;
      });
      seneca.act({role: plugin, ctrl: 'dojo', cmd: 'submit', dojo: dojo, user: user},
        function (err, submittedDojo) {
          dojo = submittedDojo;
          done();
      });
    });
  });

  lab.after(function (done) {
    seneca.close();
    done();
  });

  lab.test('the dojo should be saved with its default values', function (done) {
    expect(dojo.verified).to.equal(0);
    expect(dojo.deleted).to.equal(0);
    expect(dojo.created).to.be.sameMoment(new Date(), 'minute');
    // This is the lead user, NOT the submitting user
    expect(dojo.creator).to.equal(leadStub.userId);
    expect(dojo.creatorEmail).to.equal(leadStub.email);
    done();
  });

  lab.test('the relationship between the user and the dojo should be created', function (done) {
    seneca.act({role: plugin, entity: 'userdojo', cmd: 'list', query: {userId: user.id, dojoId: dojo.id}},
    function (err, champions) {
      expect(champions.length).to.equal(1);
      var champion = champions[0];
      expect(champion.owner).to.equal(1);
      expect(champion.userTypes).to.eql(['champion']);
      expect(champion.userPermissions).to.eql([{title: 'Dojo Admin', name: 'dojo-admin'},
      {title: 'Ticketing Admin', name: 'ticketing-admin'}]);
      expect(champion.deleted).to.equal(0);
      // This is the lead user, NOT the submitting user
      expect(champion.userId).to.equal(leadStub.userId);
      expect(champion.dojoId).to.equal(dojo.id);
      done();
    });
  });

  lab.test('CDF admin should be notified', function (done) {
    expect(sent).to.be.true;
    done();
  });
});
