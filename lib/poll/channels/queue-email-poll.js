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
 */
function sendEmailPoll (args, done) {
  var seneca = this;
  var plugin = args.role;
  var pollId = args.pollId;
  var protocol = process.env.PROTOCOL || 'http';
  var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

  var getDojos = function (cb) {
    seneca.act({role: plugin, cmd: 'get_polled_list', query: args.query},
      function(err, dojos) {
        if(err) return done(err);
        cb(null, dojos);
    });
  };

  var sendEmail = function (dojos, cb) {
    async.each(dojos, function(dojo, sent){
      var payload = {
        to: dojo.email,
        code: 'polls-notification-',
        locality: dojo.alpha2.toLowerCase() + '_' + dojo.alpha2,
        content: {
          dojoName: dojo.name,
          dojoId: dojo.id,
          pollId: pollId,
          pollLink: protocol + '://' + zenHostname + '/dashboard/poll/' + pollId + '/dojo/' + dojo.id
        },
        subject: 'Calling all Dojos; Answer one question, make an impact!'
      };
      var task = {role: plugin, cmd: 'send_email_poll', payload: payload};
      seneca.act({role: 'kue-queue', cmd: 'enqueue', name: 'email-poll', msg: _.clone(task), params: {
          priority: 'high',
          delay: 10000,
        }
      }, function (err) {
        if(err) return sent(err);
        return sent(null);
      });
    }, function(err){
      if(err) return done(err);
      done(null, _.map(dojos, 'email'));
    });
  };

  async.waterfall([
    getDojos,
    sendEmail
  ]);
}

module.exports = sendEmailPoll;
