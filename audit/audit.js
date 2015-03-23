'use strict';

var path = require('path');
var _ = require('lodash');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-audit';
  var version = '1.0';

  seneca.add({ init:plugin }, function (args, done) {
    var seneca = this;

    var entities = ['sys/-', 'cd/-'];

    var cmds = ['save','remove'];

    _.each(entities, function (entspec) {
      _.each(cmds, function (cmd) {
        entspec = _.isString(entspec) ? seneca.util.parsecanon(entspec) : entspec;
        var spec = _.extend({role:'entity', cmd:cmd}, entspec);
        seneca.add(spec, audit);
      });
    });

    done();
  });

  var audit$ = seneca.make('audit/audit');

  function audit(args, done) {
    var prior = this.prior;
    if( !prior ) {
      return done(seneca.fail({code:'perm/no-prior',args:args}));
    }

    var user = args.req$ && args.req$.user;

    var actaudit = args.audit$;
    delete args.audit$;

    var act = _.omit(args, ['req$', 'res$']);
    if (actaudit) {
      _.extend(act, actaudit);
    }

    var auditent = audit$.make$();
    auditent.save$({
      when: new Date(),
      act: act,
      user: user
    }, function (err) {
      if (err) { return done(err); }

      prior(args, done);
    });
  }

  return {
    name:plugin
  };
};