var _ = require('lodash');
var async = require('async');
var moment = require('moment');

module.exports = function notifyAllMembers (args, done) {
  var seneca = this;
  var dojoId = args.data.dojoId;
  var eventId = args.data.eventId;
  var plugin = args.role;
  var protocol = process.env.PROTOCOL || 'http';
  var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';
  var emailSubject = args.data.emailSubject;

  async.waterfall([
    getDojoUsers,
    checkEmail,
    getEvent,
    getDojo,
    sendEmails
  ], done);

  function getDojoUsers (done) {
    var query = { dojoId: dojoId, deleted: 0 };

    seneca.act({role: plugin, cmd: 'load_dojo_users', query: query}, function (err, response) {
      if (err) return done(err);
      done(null, response.response);
    });
  }

  function checkEmail (users, done) {
    async.map(users, function (user, callback) {
      if (_.isEmpty(user.email)) {
        seneca.act({role: 'cd-profiles', cmd: 'load_parents_for_user', userId: user.id, user: args.user}, function (err, parents) {
          if (err) return seneca.log.warn('No parent found for', user.id);
          //  TODO:80 handle multiple parents
          user.parent = parents[0];

          //  excluse this child if the parent email is already in the list, to avoid multiple emails
          if (_.some(users, {email: user.parent.email})) {
            user = void 0;
          }
          callback(null, user);
        });
      } else {
        callback(null, user);
      }
    },
    function (err, users) {
      if (err) done(err);
      done(null, _.pull(users, void 0));
    });
  }

  function getEvent (users, done) {
    seneca.act({role: 'cd-events', cmd: 'getEvent', id: eventId}, function (err, event) {
      if (err) return done(err);
      done(null, users, event);
    });
  }

  function getDojo (users, event, done) {
    seneca.act({role: plugin, cmd: 'load', id: dojoId}, function (err, dojo) {
      if (err) return done(err);
      done(null, users, event, dojo);
    });
  }

  function sendEmails (users, event, dojo, done) {
    if (users) {
      var content = {
        link: protocol + '://' + zenHostname + '/dashboard/dojo/' + dojo.urlSlug,
        dojo: {
          name: dojo.name,
          email: dojo.email
        },
        event: {
          name: event.name
        },
        year: moment(new Date()).format('YYYY')
      };

      var code = '';
      var baseCode = '';
      if (event.type === 'recurring') {
        baseCode = 'notify-all-members-recurring-';
      } else {
        baseCode = 'notify-all-members-oneoff-';
        var startDateUtcOffset = moment(_.head(event.dates).startTime).utcOffset();
        var endDateUtcOffset = moment(_.head(event.dates).endTime).utcOffset();

        var startDate = moment.utc(_.head(event.dates).startTime).subtract(startDateUtcOffset, 'minutes').toDate();
        var endDate = moment.utc(_.head(event.dates).endTime).subtract(endDateUtcOffset, 'minutes').toDate();

        content.event.date = moment(startDate).format('Do MMMM YY') + ', ' +
          moment(startDate).format('HH:mm') + ' - ' +
          moment(endDate).format('HH:mm');
      }
      var locality = args.locality || 'en_US';

      _.forEach(users, function (user) {
        content.dojoMember = user.name;
        var email = user.email;
        code = baseCode;
        if (!_.isEmpty(user.parent) && !_.isEmpty(user.parent.email)) {
          email = user.parent.email;
          code = 'parents-' + baseCode;
          content.childrenName = user.name;
          content.dojoMember = user.parent.name;
        }
        if (!_.isEmpty(email)) {
          var payload = {replyTo: dojo.email, from: '"' + dojo.name + '" <' + dojo.email + '>', to: email,
            code: code, locality: locality, content: content, subject: emailSubject, subjectVariables: [dojo.name]};
          var task = { role: plugin, cmd: 'send_email', payload: _.cloneDeep(payload) };
          seneca.act({role: 'kue-queue', cmd: 'enqueue', name: 'email-user', msg: _.clone(task),
            params: {
              priority: 'high',
              delay: 10000
            },
          });
        }
      });
      done();
    }
  }
}
