'use strict';

var async = require('async');

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-users';
  var ENTITY_NS = 'cd/users';

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'get_init_user_types'}, cmd_get_init_user_types);

  function cmd_list(args, done) {
    done(null, []);
  }

  function cmd_get_init_user_types(args, done) {
    done(null, []);
  }

  return {
    name: plugin
  };
};
