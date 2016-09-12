var _ = require('lodash');
var twilio = require('twilio');
var async = require('async');

//  curl -d '{"role": "cd-dojos", "cmd":"send_sms_poll"}' http://localhost:10301/act
function sendSMSPoll (args, callback) {
  var seneca = this;
  var sms = args.sms;
  var plugin = args.role;
  // https://www.twilio.com/blog/2013/03/introducing-the-twilio-module-for-node-js.html
  var client = new twilio.RestClient(process.env.TWILIO_CLIENT_ID, process.env.TWILIO_CLIENT_KEY);

  var generateTpl = function (wfCb) {
    seneca.act({role: 'mail', cmd: 'generate', code: args.sms.template, content: args.sms.content },
    function (err, generated) {
      // If there is an error while generating the template, it's going to crash watsoever because we can't catch it
      wfCb(null, generated.text);
    });
  };

  var sendSMS = function (template, wfCb) {
    client.sendMessage({
        // We need to append a plus or twilio will consider the area number
        // is the one from the purchased number (appending +252 in our case)
        to: '+' + sms.phoneNumber,
        // TODO : ? retrieve from twilio API https://www.twilio.com/docs/api/rest/incoming-phone-numbers#instance ?
        // Still needs an ID which is relative to the phone number, pointless ?
        from: process.env.TWILIO_PHONE_NB,
        body: template
    }, function (error, message) {
        if (error) {
          console.error('Oops! There was an error.', error);
        }
        wfCb(error, message);
    });
  };

  async.waterfall ([
    generateTpl,
    sendSMS
  ], function (err, sms) {
    callback(err, sms);
  });
}

module.exports = sendSMSPoll;
