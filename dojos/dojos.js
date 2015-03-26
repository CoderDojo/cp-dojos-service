'use strict';

var path = require('path');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-dojos';
  var version = '1.0';
  var ENTITY_NS = 'cd/dojos';

  seneca.add({ role: plugin, cmd: 'search'}, cmd_search);
  seneca.add({ role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({ role: plugin, cmd: 'delete'}, cmd_delete);

  function cmd_search(args, done){
    var seneca = this, query = {}, dojos_ent;
    query = args.query;

    dojos_ent = seneca.make$(ENTITY_NS);
    dojos_ent.list$(query, done);
  }

  function cmd_create(args, done){
    var seneca = this, query = {}, dojo_ent, dojo;
    dojo = args.dojo;

    seneca.make$(ENTITY_NS).save$(dojo, function(err, response) {
      if(err){
        return done(err);
      }

      done(null, response);
    });
  }

  function cmd_delete(args, done){
    var seneca = this;
    var id = args.id;

    seneca.make$(ENTITY_NS).remove$( id, function(err){
      if(err){
        return done(err);
      }
      done();
    });
  }

   // web interface
  seneca.act({ role: 'web', use: {
    prefix: '/',
    pin: { role: plugin, cmd: '*' },
    map: {
      'search': {POST: true, alias: 'dojos/search'},
      'create': {POST: true, alias: 'dojos'},
      'delete': {DELETE: true, alias: 'dojos/:id'}
    }
  }});


  return {
    name: plugin
  };

};