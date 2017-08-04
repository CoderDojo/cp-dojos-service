'use strict';

var async = require('async');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-agreements';
  var ENTITY_NS = 'cd/agreements';

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'save'}, cmd_save);

  function cmd_list (args, done) {
    done(null, []);
  }

  function cmd_save (args, done) {
    done(null, args.agreement);
  }

  return {
    name: plugin
  };
};
