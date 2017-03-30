var async = require('async');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

/**
 * Webhook handler to recover an SMS to save a poll result and respond a twiML to thanks
 * @param  {Object}   args raw SMS received
 * @return {XML}      twiML to cheer
 */
function saveSMSResult (args, done) {
  var seneca = this;
  var plugin = args.role;
  var protocol = process.env.PROTOCOL || 'http';
  var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

  // The full args payload is mixed up with the SMS data..
  var getSMS = function (waterfallCb) {
    seneca.act({role: plugin, cmd: 'get_sms', sms: args},
    function (err, sms) {
      if (err) return done(err);
      return waterfallCb(null, sms);
    });
  };

  var getPoll = function (sms, wfCb) {
    // CurrentDate always be upper than the starting date as the polling SMS process is triggered 2 days after the poll is starting
    // We also assume only 1 poll is running at a time
    var now = new Date();
    seneca.act({role: plugin, cmd: 'get_poll_setup', query: {startedAt: {lt$: now}, endDate: {gt$: now}}}, function (err, polls) {
      if (err) return done(err);
      if (polls.length > 1) {
        return done(null, {http$: {status: 400}, data: 'More than one poll at a time, notify a CDF'});
      }
      if (polls.length < 1) {
        return done(null, {http$: {status: 400}, data: 'No poll running at that time'});
      }
      return wfCb(null, sms, polls[0]);
    });
  };

  var getUserProfile = function (sms, poll, wfCb) {
    var phone = sms.From.replace(/^\+/, '');
    seneca.act({role: 'cd-profiles', cmd: 'list', query: {phone: phone}},
     function (err, champProfiles) {
      if (err) return done(err);
      if (champProfiles && champProfiles.length > 0) {
        seneca.act({role: plugin, cmd: 'load_usersdojos', query: {userId: {in$: _.map(champProfiles, 'userId')}}},
        function (err, usersDojos) {
          if (err) return done(err);
          var champs = _.filter(usersDojos, function (user) {
            return user.userTypes.indexOf('champion') > -1;
          });
          if (champs.length > 1) {
            return done(null, {http$: {status: 400}, data: 'Impossible to determinate unique champion from phone n° when saving poll answer'});
          }
          if (champs.length < 1) {
            return done(null, {http$: {status: 400}, data: 'No champion found with phone n° when saving poll answer'});
          }
          champProfiles[0].dojoId = champs[0].dojoId;
          return wfCb(null, sms, poll, champProfiles[0]);
        });
      } else {
        return done(null, {http$: {status: 400}, data: 'No user found with phone n° when saving poll answer'});
      }
    });
  };

  var savePollResult = function (sms, poll, champProfile, waterfallCb) {
    var result = {
      value: sms.Body,
      dojoId: champProfile.dojoId,
      pollId: poll.id
    };

    seneca.act({role: plugin, cmd: 'save_poll_result', poll: result},
    function (err, result) {
      if (err) return done(err);
      return waterfallCb(null, champProfile, poll);
    });
  };

  var getThanksTwiML = function (champProfile, poll, waterfallCb) {
    var templateCode = 'polls-sms-cheering-';
    var locality = champProfile.alpha2 ? champProfile.alpha2.toLowerCase() + '_' + champProfile.alpha2 : 'en_US';
    if (!fs.existsSync(path.join(__dirname, '/email-templates/', templateCode))) locality = 'en_US';
    seneca.act({role: plugin, cmd: 'get_twiML', data: {
      tpl: templateCode + locality,
      content: {
        pollLink: protocol + '://' + zenHostname + '/dashboard/poll/' + poll.id + '/dojo/' + champProfile.dojoId
      }
    }},
    function (err, twiML) {
      if (err) return done(err);
      return waterfallCb(null, twiML);
    });
  };

  async.waterfall([
    getSMS,
    getPoll,
    getUserProfile,
    savePollResult,
    getThanksTwiML
  ], function (err, twiML) {
    if (err) return done(err);
    done(null, {data: twiML});
  });
}

module.exports = saveSMSResult;
