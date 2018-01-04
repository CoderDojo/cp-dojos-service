var _ = require('lodash');
var async = require('async');
var path = require('path');
var I18NHelper = require('cp-i18n-lib');
var i18nHelper = new I18NHelper({
  poFilePath: path.resolve('web/locale/'),
  poFileName: 'messages.po',
  domain: 'coder-dojo-platform'
});
var sanitizeHtml = require('sanitize-html');
/**
 * Send a customized email to a specified list of members
 * @param  {Array}    userIds   List of users to contact
 * @param  {Object}   data      Object containing subject and content of the email
 */
module.exports = function (args, done) {
  var seneca = this;
  var so = seneca.options;
  var plugin = args.role;
  var dest = args.userIds;
  var payload = args.data;
  var dojoId = args.dojoId;
  payload.bypassTranslation = true;
  payload.content = {content: sanitizeHtml(payload.content, so.sanitizeTextArea)};
  payload.code = 'notify-empty-';
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
    function getDojoUsers (dojo, wfCb) {
      seneca.act({role: plugin, cmd: 'load_dojo_users', query: { dojoId: dojoId }}, function (err, usersDojo) {
        if (err) return done(err);
        return wfCb(null, dojo, usersDojo);
      });
    },
    function getUsersData (dojo, usersDojo, wfCb) {
      seneca.act({role: 'cd-profiles', cmd: 'search', query: {userId: {in$: dest}}},
        function (err, profiles) {
          if (err) return done(err);
          return wfCb(null, dojo, usersDojo, profiles);
        });
    },
    // We cannot optimize to only 1 profiles loop as we need to aggregate parents profile (multiple kids)
    function getParentsData (dojo, usersDojo, profiles, wfCb) {
      var userDojoIds = _.map(usersDojo.response, 'userId');
      var parents = {};
      async.map(profiles, function (profile, mCb) {
        if (profile.parents) {
          async.eachSeries(profile.parents, function (parentUserId, eCb) {
            // Verify parent is a part of the dojo before spamming him
            if (_.includes(userDojoIds, parentUserId)) {
              if (!profile.resolvedParents) profile.resolvedParents = [];
              seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: parentUserId}, function (err, parent) {
                if (err) return done(err);
                // Prepare forwarded emails (parents/guardians)
                if (!parents[parent.userId]) parents[parent.userId] = parent;
                if (!parents[parent.userId].resolvedChildren) parents[parent.userId].resolvedChildren = [];
                parents[parent.userId].resolvedChildren.push(profile);
                eCb();
              });
            } else {
              eCb();
            }
          }, mCb);
        } else {
          mCb();
        }
      }, function () {
        return wfCb(null, dojo, profiles, parents);
      });
    },
    function sendEmails (dojo, profiles, parents, wfCb) {
      var key = 'You have a new message from %1s Dojo:';
      var intro = i18nHelper
      .getClosestTranslation(args.locality, key)
      .fetch([dojo.name]);
      async.each(profiles, function (profile, cb) {
        var email = _.clone(payload);
        // Send email to users if they have an email
        if (profile.email) {
          email.to = profile.email;
          email.content.intro = intro;
          seneca.act({role: plugin, cmd: 'send_email', payload: email}, cb);
        } else {
          // Very likely a u13, he'll be targeted through his parent(s) through the next waterfall loop
          cb();
        }
      }, function () {
        wfCb(null, dojo, parents);
      });
    },
    function sendForwardedEmails (dojo, parentsProfiles, wfCb) {
      var intro = i18nHelper
      .getClosestTranslation(args.locality, 'Your child %1s has a new message from %2s Dojo:');
      // Reason to use values is that async API is unstable (0.9.2) on objects
      async.eachSeries(_.values(parentsProfiles), function (parentProfile, sCb) {
        var kidsNames = _.map(parentProfile.resolvedChildren, 'name');
        var email = _.clone(payload);
        var lIntro = _.clone(intro);
        lIntro = lIntro.ifPlural(parentProfile.resolvedChildren.length, 'Your children %1s have a new message from %2s Dojo:')
        .fetch([kidsNames.join(','), dojo.name]);
        email.to = parentProfile.email;
        email.content.intro = lIntro;
        seneca.act({role: plugin, cmd: 'send_email', payload: email}, sCb);
      }, wfCb);
    }
  ], function (err, res) {
    if (err) return done(err);
    return done(null, {ok: true});
  });
};
