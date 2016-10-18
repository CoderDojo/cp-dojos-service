var _ = require('lodash');

function getSMS (args, callback) {
  var seneca = this;
  var sms = args.sms;
  var plugin = args.role;

  sms = _.omit(sms, ['cmd', 'role', 'transport$', 'ungate$', 'tx$', 'default$', 'meta$']);
  callback(null, sms);
}

module.exports = getSMS;
