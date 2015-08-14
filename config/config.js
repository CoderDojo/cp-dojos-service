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

      if (process.env.SENECA_DEBUG === 'true') {
        console.log(arguments);
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
      email: process.env.GOOGLE_EMAIL,
      keyFile: process.env.GOOGLE_KEY_FILE,
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.user"
      ],
      subject: process.env.GOOGLE_SUBJECT
    }
  }

  return {
    'postgresql-store': pgConfig(),
    'google-api': googleApiConfig(),

    'email-notifications': {
      sendemail:true,
      email: {
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
      type: 'tcp',
      tcp: {
        port: 10301
      }
    },
    limits: {
      maxUserDojos: process.env.LIMITS_MAX_USER_DOJOS || 30
    },
    timeout: 120000,
    strict: {add:false,  result:false},
    log: log()
  };
}
