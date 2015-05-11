'use strict';

module.exports = function(options){
  var seneca = this;

  var plugin = 'cd-profiles';
  var ENTITY_NS = 'cd/profiles';

  seneca.add({ role: plugin, cmd: 'list'}, cmd_list);

  function cmd_list(args, done){
    var profiles_ent, seneca = this;

    var query = args.query ? args.query : {};

    profiles_ent = seneca.make(ENTITY_NS);

    profiles_ent.list$(query, function(err, profile){
      if(err){
        return done(err);
      }
      done(null, profile);
    });
  }


  return {
    name: plugin
  };
};