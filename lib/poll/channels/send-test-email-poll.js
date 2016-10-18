var async = require('async');
var _ = require('lodash');

/*  TODO:20 : export as a different microservice?
polls can be related to users, event, not only dojos */

/**
 * sendEmailPoll - Select a subset of dojo and send them an email containing a link regarding a specified poll
 *
 * @param  *String pollId the poll to achieve
 * @param  [Int] skip allow subsetting
 * @param [Int] limit  allow subsetting
 * @return [Array] emails  emails that have been used
 * curl -d '{"role": "cd-dojos", "cmd":"send_test_email_poll", "pollId":1}' http://localhost:10301/act
 */
function sendTestEmailPoll (args, done) {
  var seneca = this;
  var plugin = args.role;
  var pollId = args.pollId;
  var poll = {};
  var protocol = process.env.PROTOCOL || 'http';
  var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

  //  TODO : allow custom template
  seneca.act({role: plugin, cmd: 'get_poll_setup', query: {id: pollId}}, function (err, polls) {
    if (err) return done(err);
    poll = polls[0];

    var payload = {
      to: args.email,
      code: 'polls-notification-',
      locality: 'en_US',
      content: {
        dojoName: 'FakeDojoName',
        dojoId: 'testEmail+' + args.email,
        pollId: pollId,
        question: poll.question,
        pollLink: protocol + '://' + zenHostname + '/dashboard/poll/' + pollId + '/dojo/' + 'thisIsaTestLinkItWontWork'
      },
      subject: 'Calling all Dojos; Answer one question, make an impact!'
    };
    seneca.act({role: plugin, cmd: 'send_email_poll', payload: payload}, function (err) {
      if (err) return sent(err);
      return done(null, {ok: true});
    });
  });
}

module.exports = sendTestEmailPoll;
