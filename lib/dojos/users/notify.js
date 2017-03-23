var _ = require('lodash');
var async = require('async');
/**
 * Send a customized email to a specified list of members
 * @param  {Array}    userIds   List of users to contact
 * @param  {Object}   data      Object containing subject and content of the email
 */
module.exports = function (args, done) {
  var seneca = this;
  var plugin = args.role;
  var dest = args.userIds;
  var payload = args.data;
  var dojoId = args.dojoId;
  payload.code = 'notify-empty-';
  payload.bypassTranslation = true;
  payload.content = {content: payload.content};
  async.waterfall([
    function getDojoData (wfCb) {
      seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, dojo) {
        if (err) return done(err);
        payload.from = dojo.email;
        payload.replyTo = dojo.email;
        payload.locality = args.locality || 'en_US';
        payload.content.dojoName = dojo.name;
        return wfCb(null, dojo);
      });
    },
    function getUsersData (dojo, wfCb) {
      seneca.act({role: 'cd-profiles', cmd: 'search', query: {userId: {in$: dest}}},
        function (err, profiles) {
          if (err) return done(err);
          return wfCb(null, dojo, profiles);
        });
    },
    function sendEmails (dojo, profiles, wfCb) {
      async.each(profiles, function (profile, cb) {
        var email = _.clone(payload);
        email.to = profile.email;
        seneca.act({role: plugin, cmd: 'send_email', payload: email}, cb);
      }, wfCb);
    }
  ], function (err, res) {
    if (err) return done(err);
    return done(null, {ok: true});
  });
};
