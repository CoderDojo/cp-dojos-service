'use strict';

var async = require('async');

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-salesforce';

  seneca.add({role: plugin, cmd: 'get_account'}, cmd_get_account);
  seneca.add({role: plugin, cmd: 'save_lead'}, cmd_save_lead);
  seneca.add({role: plugin, cmd: 'convert_lead_to_account'}, cmd_convert_lead_to_account);

  function cmd_get_account(args, done) {
    done(null, { accId: args.accId });
  }

  function cmd_save_lead(args, done) {
    done(null, {});
  }

  function cmd_convert_lead_to_account(args, done) {
    done(null, {});
  }

  return {
    name: plugin
  };
};
