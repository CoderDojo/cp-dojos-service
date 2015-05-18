"use strict";

var _ = require('lodash')
var async = require('async')

module.exports = function( options ) {
  var seneca = this
  var plugin = 'email-notifications'

  var so = seneca.options()

  options = seneca.util.deepextend({
  }, so[plugin], options)


  seneca.add({ role:plugin, cmd:'send' }, send_notification)

  function send_notification(args, done) {
    if (options.sendemail && options.email) {
      var email = options.email[args.code];
      seneca.act({
        role: 'mail', cmd: 'send',
        code: args.code,
        to: args.to,
        subject: email.subject,
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