 var async = require('async');
 var _ = require('lodash');
 var fs = require('fs');
 var path = require('path');

 /**
  * Send SMS to get the poll results
  * @param  {String}   pollId Identifier of the pol
  * @param  {Object}   query filters to limit the scope of polled dojos
  */
 function sendSMSDataCollection (args, done) {
   var seneca = this;
   var plugin = args.role;
   var pollId = args.pollId;
   var protocol = process.env.PROTOCOL || 'http';
   var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

   var getChampions = function(waterfallCb) {
    seneca.act({role: plugin, cmd: 'get_polled_list', query: args.query},
      function (err, dojos) {
        if(err) return done(err);
      seneca.act({role: plugin, cmd: 'get_poll_results', query: {dojoId: {in$: _.map(dojos, 'id')} , pollId: pollId }}, function (err, results) {
        var unanswered = _.reject(dojos, function (dojo) {
          return _.map(results, 'dojoId').indexOf(dojo.id) > -1;
        });
        if (unanswered.length > 0) {
          // Get champions
          seneca.act({role: plugin, cmd: 'load_usersdojos', query: {dojoId: {in$: _.map(unanswered, 'id')}}}, function (err, users ) {
            if (err) return done(err);
            // Remove
            var champs = _.filter(users, function (user) {
              return user.userTypes.indexOf('champion') > -1;
            });
            async.mapSeries(champs, function (champ, next) {
              seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: champ.userId}, function (err, champProfile) {
                if (err) return next(err);
                champ.phone = champProfile.phone;
                return next(null, champ);
              });
            }, function (err, toBeContacted){
              if (err) return done(err);
              var champs = _.filter(toBeContacted, function(champion){ return !_.isEmpty(champion.phone);});
              return waterfallCb(null, champs);
            });
          });
        } else {
          return done(null, {ok: true, why: 'No sms to send'});
        }
      });
    });
  };

  var setTemplate = function (champs, waterfallCb) {
    var payloads = {};
    async.mapSeries(champs, function (champ, next) {
      if (payloads[champ.id]) {
        payloads[champ.id].template = 'polls-sms-notification-reminder-';
      } else {
        payloads[champ.id] = champ;
        payloads[champ.id].template = 'polls-sms-notification-';
      }
      var locality = champ.alpha2 ? champ.alpha2.toLowerCase() + '_' + champ.alpha2 : 'en_US';
      if (!fs.existsSync(path.join(__dirname, '/email-templates/', payloads[champ.id].template + locality))) locality = 'en_US';
      payloads[champ.id].template = payloads[champ.id].template + locality;
      next(null);// What could possibly go wrong?
    }, function () {
      waterfallCb(null, payloads);
    });
  };

  var queueSMS = function (champs, waterfallCb) {
    async.eachSeries(_.keys(champs), function (champId, next) {
      var champ = champs[champId];
      var payload = {
        pollId: pollId,
        dojoId: champ.dojoId,
        phoneNumber: champ.phone,
        content: {
          pollLink: protocol + '://' + zenHostname + '/poll/' + pollId + '/dojo/' + champ.dojoId
        },
        template: champ.template
      };
      var task = {role: plugin, cmd: 'send_sms_poll', sms: _.clone(payload)};
      seneca.act({role: 'kue-queue', cmd: 'enqueue', name: 'sms-poll', msg: _.clone(task)}, function (err) {
        if(err) return done(err);
        return next(null);
      });
    }, waterfallCb);
  };

  async.waterfall([
    getChampions,
    setTemplate,
    queueSMS
  ], done);
}



 module.exports = sendSMSDataCollection;
