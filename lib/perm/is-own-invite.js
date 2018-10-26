var async = require('async');
var _ = require('lodash');

//  TODO: this follows a pattern of relation/field/expectedValue,
//  perm-engine to rewrite to avoid this fn()
function isOwnInvite (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var inviteId = args.params.data.inviteToken;
  //Srsly, nice token system, you can"t query by user, WTF.
  var dojoId = args.params.data.dojoId;
  var isOwn = {};

  seneca.make$('cd/dojos').load$(dojoId, function (err, dojo) {
    if (err) {
      seneca.log.error(seneca.customValidatorLogFormatter('cd-dojos', 'isOwnInvite', err, {userId: userId, inviteId: inviteId, dojoId: dojoId}));
      return done(null, {'allowed': false});
    }
    if (dojo.userInvites) {
      const invites = dojo.userInvites.map((invite) => ({
        id: invite.id,
        // Due to dojo saving overwriting invites, the email may be null
        email: invite.email ? invite.email.toLowerCase() : '',
      }));
      isOwn = _.find(invites, { id: inviteId, email: args.user.email.toLowerCase() });
    }
    isOwn = !_.isEmpty(isOwn)? true: false;
    return done(null, {'allowed': isOwn});
  });
}

module.exports = isOwnInvite;
