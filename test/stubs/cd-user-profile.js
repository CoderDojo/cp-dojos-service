'use strict';

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-user-profile';

  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);

  function cmd_load(args, done) {
    done(null, [{userType: 'parent-guardian'}]);
  }

  function cmd_list(args, done) {
    done(null, [{userType: 'parent-guardian'}]);
  }

  return {
    name: plugin
  };
};
