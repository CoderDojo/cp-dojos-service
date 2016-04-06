var path = require('path');

module.exports = function () {
  function pgConfig () {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
      nolimit: true
    };
  }

  function googleApiConfig () {
    return {
      enabled: process.env.GOOGLE_API_ENABLED === 'true',
      email: process.env.GOOGLE_EMAIL,
      keyFile: process.env.GOOGLE_KEY_FILE,
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.user'
      ],
      subject: process.env.GOOGLE_SUBJECT
    };
  }

  return {
    'postgresql-store': pgConfig(),
    'google-api': googleApiConfig(),
    'email-notifications': {
      sendemail: true,
      sendFrom: 'The CoderDojo Team <info@coderdojo.org>',
      email: {
        headers: {'X-SMTPAPI': '{"category": ["cp-dojos-service"]}'}
      }
    },
    mailtrap: {
      folder: path.resolve(__dirname + '/../email-templates'),
      mail: {
        from: 'no-reply@coderdojo.com'
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
    email: {
      folder: path.resolve(__dirname + '/../email-templates'),
      config: {
        pool: true,
        service: 'sendgrid',
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        }
      }
    },
    transport: {
      type: 'web',
      web: {
        timeout: 120000,
        port: 10301
      }
    },
    limits: {
      maxUserDojos: process.env.LIMITS_MAX_USER_DOJOS || 30
    },
    timeout: 120000,
    strict: { add: false, result: false },
    actcache: { active: false }
  };
};
