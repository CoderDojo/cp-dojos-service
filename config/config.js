var path = require('path');
var assert = require('assert');
var LogEntries = require('le_node');
var generator = require('xoauth2').createXOAuth2Generator({
  user: process.env.GMAIL_USER,
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN
});

module.exports = function() {

  function log () {
    // seneca custom log handlers
    function debugHandler() {
      //console.log(JSON.stringify(arguments));

      if (process.env.LOGENTRIES_ENABLED === 'true') {
        assert.ok(process.env.LOGENTRIES_DEBUG_TOKEN, 'No LOGENTRIES_DEBUG_TOKEN set');
        var le = new LogEntries({
          token: process.env.LOGENTRIES_DEBUG_TOKEN,
          flatten: true,
          flattenArrays: true
        });

        le.log('debug', arguments);
      }
    }

    function errorHandler() {
      console.error(JSON.stringify(arguments));

      if (process.env.LOGENTRIES_ENABLED === 'true') {
        assert.ok(process.env.LOGENTRIES_ERRORS_TOKEN, 'No LOGENTRIES_ERROR_TOKEN set');
        var le = new LogEntries({
          token: process.env.LOGENTRIES_ERRORS_TOKEN,
          flatten: true,
          flattenArrays: true
        });

        le.log('err', arguments);
      }
    }

    return {
      map:[{
        level:'debug', handler: debugHandler
      }, {
        level:'error', handler: errorHandler
      }]
    };
  };


  function pgConfig() {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD
    }
  };

  function googleApiConfig() {
    return {
      enabled: process.env.GOOGLE_API_ENABLED === 'true',
      email: "1075875288894-8vec5965koo2580s16hvo3ah4bc5h32f@developer.gserviceaccount.com",
      keyFile: path.resolve(__dirname + '/community-platform-testing-key.pem'),
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.user"
      ],
      subject:  "ursula@coderdojo.org"
    }
  }

  return {
    'postgresql-store': pgConfig(),
    'google-api': googleApiConfig(),

    'email-notifications': {
      sendemail:true,
      email: {
        'invite-user-en_us':{
          subject:'New Dojo Invitation'
        },
        'user-request-to-join-en_us':{
          subject:'New Request to join your Dojo'
        },
        'user-left-dojo-en_us': {
          subject:'A user has left your Dojo'
        },
        'one-off-event-application-approved-en_us': {
          subject:'Event application approved'
        },
        'recurring-event-application-approved-en_us': {
          subject:'Event application approved'
        },
        'one-off-event-application-received-en_us': {
          subject:'Event application received'
        },
        'recurring-event-application-received-en_us': {
          subject:'Event application received'
        },
        'accept-badge-award-en_us': {
          subject:'CoderDojo Badge Nomination'
        },
        'mentor-request-to-join-en_us':{
          subject:'New Mentor Request to join your Dojo'
        },
        'google-email-pass-en_us':{
          subject:'We created a new Google Email for your Dojo'
        }
      }
    },
    mailtrap: {
      folder: path.resolve(__dirname + '/../email-templates'),
      mail: {
        from:'no-reply@coderdojo.com'
      },
      config: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        }
      }
    },
    gmail: {
      folder: path.resolve(__dirname + '/../email-templates'),
      config: {
        service: 'gmail',
        auth: {
          xoauth2: generator
        }
      }
    },
    transport: {
      type: 'web',
      web: {
        host: '0.0.0.0',
        port: 10301
      }
    },
    limits: {
      maxUserDojos: process.env.LIMITS_MAX_USER_DOJOS || 10
    },
    log: log()
  };
}
