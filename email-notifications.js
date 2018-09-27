'use strict';

var fs = require('fs');
var _ = require('lodash');
var CpTranslations = require('cp-translations');
var I18NHelper = require('cp-i18n-lib');
var i18nHelper = new I18NHelper({
  poFilePath: CpTranslations.getPoFilePath(),
  poFileName: 'messages.po',
  domain: 'coder-dojo-platform'
});

module.exports = function (options) {
  var seneca = this;
  var plugin = 'email-notifications';
  var { logger } = options;

  var so = seneca.options();

  options = seneca.util.deepextend({}, so[plugin], options);

  seneca.add({role: plugin, cmd: 'send'}, send_notification);

  function send_notification (args, done) {
    var subject = args.subject;
    var bypassTranslation = args.bypassTranslation;
    var subjectVariables = args.subjectVariables || [];
    var subjectTranslation;
    var emailCode;
    var locale = args.locality;
    var code = args.code;
    if (options.sendemail && options.email) {
      emailCode = code + locale;
      if (!fs.existsSync(CpTranslations.getEmailTemplatePath(emailCode))) emailCode = code + 'en_US';
      if (!args.to) return done(null, {ok: false, why: 'No recipient set.'});

      if (!bypassTranslation) {
        subjectTranslation = i18nHelper.getClosestTranslation(locale, subject);
        if (subjectTranslation === null) {
          return done(null, {ok: false, why: 'Invalid email subject.'});
        }
        subject = subjectTranslation.fetch(subjectVariables);
      }
      logger.warn('email-notifications', JSON.stringify(args));
      seneca.act({
        role: 'mail', cmd: 'send',
        from: args.from || options.sendFrom,
        code: emailCode,
        to: args.to,
        replyTo: args.replyTo || options.sendFrom,
        subject: subject,
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
