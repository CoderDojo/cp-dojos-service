var path = require('path');
var camelCase = require('camelcase');  // Lodash functions for that are stripping $ which we use for special keys
var decamelize = require('decamelize');
var CpTranslations = require('cp-translations');

module.exports = function (options) {
  function pgConfig () {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
      nolimit: true,
      fromColumnName: (attr) => camelCase(attr),
      toColumnName: (attr) => decamelize(attr)
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

  function kueConfig () {
    return {
      start: process.env.KUE_REQUIRED,
      redis: {
        host: process.env.KUE_HOST || 'localhost',
        port: process.env.KUE_PORT || '6379'
      }
    };
  }

  return {
    'postgresql-store': pgConfig(),
    'google-api': googleApiConfig(),
    'kue': kueConfig(),
    'email-notifications': {
      sendemail: true,
      sendFrom: 'The CoderDojo Team <info@coderdojo.org>',
      email: {
        headers: {'X-SMTPAPI': '{"category": ["cp-dojos-service"]}'}
      }
    },
    maildev: {
      folder: path.resolve(CpTranslations.getEmailTemplatePath()),
      mail: {
        from: 'no-reply@coderdojo.com'
      },
      config: {
        host: 'maildev',
        port: 25,
        ignoreTLS: true
      }
    },
    email: {
      folder: path.resolve(CpTranslations.getEmailTemplatePath()),
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
        port: options && options.port ? options.port : 10301
      }
    },
    shared: {
      botEmail: 'enquiries+bot@coderdojo.com'
    },
    limits: {
      maxUserDojos: process.env.LIMITS_MAX_USER_DOJOS || 30
    },
    timeout: 120000,
    env: {
      hostname: process.env.HOSTNAME || '127.0.0.1:8000',
      protocol: process.env.HOSTNAME ? 'https' : 'http'
    },
    strict: { add: false, result: false },
    actcache: { active: false }
  };
};
