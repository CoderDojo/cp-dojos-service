'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'email-notifications';

  var so = seneca.options();

  options = seneca.util.deepextend({}, so[plugin], options);

  seneca.add({role: plugin, cmd: 'send'}, send_notification);

  function send_notification (args, done) {
    if (options.sendemail && options.email) {
      var emailCode = args.code + args.locality;
      if (!fs.existsSync(path.join(__dirname, '/email-templates/', emailCode))) emailCode = args.code + 'en_US';
      if (!args.to) return done(null, {ok: false, why: 'No recipient set.'});
      seneca.act({
        role: 'mail', cmd: 'send',
        from: args.from || options.sendFrom,
        code: emailCode,
        to: args.to,
        replyTo: args.replyTo || options.sendFrom,
        subject: args.subject,
        content: args.content,
        headers: setHeader()
      }, done);
    } else {
      done();
    }

    /**
    * @function : recover the predefined header and append the function name to it
    */
    function setHeader () {
      var headerContainer = _.cloneDeep(options.email.headers);
      if (emailCode) {
        var headerKey = _.keys(headerContainer)[0];
        if (headerKey) {
          var JSONHeaderValue = JSON.parse(headerContainer[headerKey]);
          var categoryHeaderKey = _.keys(JSONHeaderValue)[0];
          JSONHeaderValue[categoryHeaderKey].push(emailCode);
          headerContainer[headerKey] = JSON.stringify(JSONHeaderValue);
        }
      }
      return headerContainer;
    }
  }

  return {
    name: plugin
  };
};
