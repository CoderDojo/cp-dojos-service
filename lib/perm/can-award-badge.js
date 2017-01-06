/**
 * Verify that the logged in user is an admin of a dojo which the awardee is a member of
 * @param  {Object}   args Contains the logged in user and target user to test
 * @return {Boolean}        isAllowed, True/false
 */
function canAwardBadge (args, done) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var applicationData = args.params.applicationData;
  var targetUserId = (applicationData && applicationData.user) ? applicationData.user.id : null;
  var USER_DOJO_ENTITY_NS = 'cd/usersdojos';
  if (userId && targetUserId) {
    seneca.make$(USER_DOJO_ENTITY_NS).native$(function (err, client, release) {
      if (err) {
        release();
        seneca.log.error(seneca.customValidatorLogFormatter('cd-dojos', 'canAwardBadge::1', err, {userId: userId, applicationData: applicationData, targetUserId: targetUserId}));
        return done(null, {'allowed': false});
      }
      client.query('SELECT COUNT(*) FROM cd_usersdojos AS ud1 JOIN cd_usersdojos AS ud2 ON ud1.dojo_id=ud2.dojo_id'
        + ' WHERE ud1.user_id=$1 AND ud2.user_id=$2 AND ud1.deleted=0 AND ud2.deleted=0'
        + ' AND (ud1.user_types::text ILIKE \'%champion%\' OR ud1.user_permissions::text ILIKE \'%dojo-admin%\')', [userId, targetUserId], function (err, response) {
        release();
        if (err) {
          seneca.log.error(seneca.customValidatorLogFormatter('cd-dojos', 'canAwardBadge::2', err, {userId: userId, applicationData: applicationData, targetUserId: targetUserId}));
          return done(null, {'allowed': false});
        }
        done(null, {'allowed': (response.rows.length > 0 && response.rows[0].count > 0)});
      });
    });
  } else {
    done(null, {'allowed': false});
  }
}

module.exports = canAwardBadge;
