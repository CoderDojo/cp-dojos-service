'use strict';

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-profiles';
 
  seneca.add({role: plugin, cmd: 'list_query'}, cmd_list_query);

  function cmd_list_query(args, done) {
    done(null, [{userType: 'parent-guardian'}]);
  }

  return {
    name: plugin
  };
};