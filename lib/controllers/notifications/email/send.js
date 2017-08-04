var moment = require('moment');
module.exports = function cmd_send_email (args, done) {
  var seneca = this;
  seneca.log.info({args: args}, 'cmd_send_email');
  var payload = args.payload;
  var to = payload.to;
  var content = payload.content;
  var from = payload.from;
  content.year = moment(new Date()).format('YYYY');
  var emailCode = payload.code;
  var emailSubject = payload.subject;
  var subjectVariables = payload.subjectVariables;
  var emailLocality = payload.locality;
  var replyTo = payload.replyTo;
  var bypassTranslation = payload.bypassTranslation;
  seneca.act({
    role: 'email-notifications',
    cmd: 'send',
    from: from,
    to: to,
    replyTo: replyTo,
    content: content,
    code: emailCode,
    locality: emailLocality,
    subject: emailSubject,
    subjectVariables: subjectVariables,
    bypassTranslation: bypassTranslation
  }, done);
};
