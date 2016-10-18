var twilio = require('twilio');

/**
 * [getTwiML description]
 * @param  {Object}   args
 * data : {
 *  tpl: '',
 *   content: {}
 * }
 * @return {String}            Stringified twiML
 */
function getTwiML (args, callback) {
  var seneca = this;
  var plugin = args.role;
  var config = args.data;
  seneca.act({role: 'mail', cmd: 'generate', code: args.data.tpl, content: args.data.content },
  function (err, generated) {
    var twiml = new twilio.TwimlResponse();
    twiml.message(generated.text);
    callback(null, twiml.toString());
  });

}

module.exports = getTwiML;
