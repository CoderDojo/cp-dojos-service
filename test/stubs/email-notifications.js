'use strict';

module.exports = function(options) {
  var seneca = this;
  var plugin = 'email-notifications';

  seneca.add({role: plugin, cmd: 'send'}, cmd_send);

  function cmd_send(args, done) {
    done();
  }

  return {
    name: plugin
  };
};
