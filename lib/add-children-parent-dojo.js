var async = require('async');
var _ = require('lodash');
var moment = require('moment');


function addChildrenParentDojo (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.userId;
  var dojoId = args.dojoId;
  seneca.act({role: 'cd-profiles', cmd: 'list', query: {userId: userId}}, function (err, userProfiles) {
    if (err) return done(err);

    var userProfile = userProfiles[0];

    if (!userProfile.children) return done();
    async.each(userProfile.children, function (youthUserId, cb) {
      seneca.act({role: 'cd-profiles', cmd: 'list', query: {userId: youthUserId}}, function (err, youthProfiles) {
        if (err) return cb(err);

        var youthProfile = youthProfiles[0];

        seneca.act({
          role: plugin,
          cmd: 'load_usersdojos',
          query: {userId: youthUserId, dojoId: dojoId}
        }, function (err, res) {
          if (err) return cb(err);

          if (!res.length) {
            var youthUserDojo = {
              userId: youthUserId,
              dojoId: dojoId,
              owner: 0,
              userTypes: [youthProfile.userType]
            };

            seneca.act({role: plugin, cmd: 'save_usersdojos', userDojo: youthUserDojo}, cb);
          } else {
            return cb();
          }
        });
      });
    }, done);
    });
}

module.exports = addChildrenParentDojo;
