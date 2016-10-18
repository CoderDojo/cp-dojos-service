var _ = require('lodash');
/**
 * Send poll email if email exists
 * @param  {Object}   payload Email payload
 * @return {Object}   {ok:bool, why:string}
 */
function sendEmailPoll (args, done) {
  var seneca = this;
  var plugin = args.role;
  var payload = args.payload;
  // Just a security for data compliance, sending email w/o "to" field tend to crash the stack..
  if (payload.to) {
    seneca.act({role: plugin, cmd: 'send_email', payload: _.clone(payload) }, function (err) {
      if(err) return done(err);
      seneca.log.info('email sent ', args.payload.to);
      return done(null, {ok: true});
    });
  } else {
    seneca.log.warn('Poll email not send : dojo email missing for ' + payload.dojoId);
    done(null, {ok: false, why: 'Dojo email missing for ' + payload.dojoId});
  }
}

module.exports = sendEmailPoll;
