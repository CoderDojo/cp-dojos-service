'use strict';

var async = require('async');

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-agreements';
  var ENTITY_NS = 'cd/agreements';

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'count'}, cmd_count);

  function cmd_list(args, done) {
    var seneca = this;

    function get_user_agreements(userId, done) {
      // probably should return: []
      done(new Error('action not stubbed!'), null)
    }
  }

  function cmd_count(args, done){
    done(new Error('action not stubbed!'), null)
  }

  return {
    name: plugin
  };
};