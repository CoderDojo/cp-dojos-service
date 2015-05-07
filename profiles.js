'use strict';

var async = require('async');
var _ = require('lodash');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-profiles';
  var ENTITY_NS = 'cd/profiles';

  seneca.add({ role: plugin, cmd: 'get_profiles'}, cmd_get_profiles);

  function cmd_get_profiles(args, done){
    var profiles_ent, id, seneca = this;

    id = args.id;

    profiles_ent = seneca.make(ENTITY_NS);

    function getProfile(id, cb){
      profiles_ent.list$({user_id : id}, function(err, profile){
        if(err){
          return cb(err);
        }
        cb(null, profile);
      });
    }

    getProfile(id, done);
  }

  return {
    name: plugin
  };
};