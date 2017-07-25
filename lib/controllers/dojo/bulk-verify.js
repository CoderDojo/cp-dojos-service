var async = require('async');
/**
 * Takes an array of dojos to verify/unverify
 * Used in CDF admin panel
 * @param  {Array}   dojos Array of dojos to (un)verify
 */
module.exports = function cmd_bulk_verify (args, done) {
  var seneca = this;
  var plugin = args.role;
  async.each(args.dojos, function (dojo, cb) {
    seneca.act({role: plugin, ctrl: 'dojo', cmd: 'verify', verified: dojo.verified, id: dojo.id, user: args.user}, cb);
  }, done);
};
