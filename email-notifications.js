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
      var email = options.email[args.code];
      console.log('*** args.code = ' + args.code);
      if (!fs.existsSync(path.join(__dirname, '/email-templates/', args.code))) {
        args.code = args.code.substring(0, args.code.length-5) + 'en_US';
      }
      if(!args.to) return done(null, {ok: false, why: 'No recipient set.'});
      seneca.act({
        role: 'mail', cmd: 'send',
        from: options.sendFrom,
        code: args.code,
        to: args.to,
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