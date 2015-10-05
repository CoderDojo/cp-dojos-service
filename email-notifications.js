"use strict";

var _ = require('lodash')
var async = require('async')
var fs = require('fs');
var path = require('path');

module.exports = function( options ) {
  var seneca = this
  var plugin = 'email-notifications'

  var so = seneca.options()

  options = seneca.util.deepextend({
  }, so[plugin], options)


  seneca.add({ role:plugin, cmd:'send' }, send_notification)

  function send_notification(args, done) {
    if (options.sendemail && options.email) {
      var emailCode = args.code + args.locality;
      if (!fs.existsSync(path.join(__dirname, '/email-templates/', emailCode))) emailCode = args.code + 'en_US';
      if(!args.to) return done(null, {ok: false, why: 'No recipient set.'});
      seneca.act({
        role: 'mail', cmd: 'send',
        from: options.sendFrom,
        code: emailCode,
        to: args.to,
        replyTo: args.replyTo || options.sendFrom,
        subject: args.subject,
        content: args.content
      }, done)
    }
    else {
      done();
    }
  }

  return {
    name: plugin
  }
}