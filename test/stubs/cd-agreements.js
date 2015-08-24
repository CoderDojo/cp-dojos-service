'use strict';

var async = require('async');

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-agreements';
  var ENTITY_NS = 'cd/agreements';

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);

  function cmd_list(args, done) {
    done(null, []);
  }

  return {
    name: plugin
  };
};
