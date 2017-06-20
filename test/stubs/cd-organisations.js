'use strict';

var async = require('async');

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-organisations';
  var ENTITY_NS = 'cd/organisations';

  seneca.add({role: plugin, ctrl: 'userOrg', cmd: 'list'}, cmd_list);

  function cmd_list(args, done) {
    done(null, []);
  }

  return {
    name: plugin
  };
};
