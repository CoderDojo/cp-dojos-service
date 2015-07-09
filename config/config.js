var path = require('path');
module.exports = function() {

  // Utility function for local development running with boot2docker
  // where we need the ip address of boot2docker instead of localhost.
  // This is for accessing containerised services.
  function localhost() {
    if (process.env.DOCKER_HOST) {
      return require('url').parse(process.env.DOCKER_HOST).hostname;
    }
    if (process.env.TARGETIP) {
      return process.env.TARGETIP;
    }
    return '127.0.0.1';
  }

  function pgConfig() {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || localhost(),
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD
    }
  };

  function esConfig() {
    return {
      connection: {
        host : (process.env.ES_HOST || localhost()) + ':9200',
        index: process.env.ES_INDEX,
        sniffOnStart: false,
        sniffInterval: false
      }
    };
  }

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
    elasticsearch: esConfig(),
    'google-api': googleApiConfig(),

    'email-notifications': {
      sendemail:true,
      email: {
        'invite-user':{
          subject:'New Dojo Invitation'
        },
        'user-request-to-join':{
          subject:'New Request to join your Dojo'
        },
        'user-left-dojo': {
          subject:'A user has left your Dojo'
        },
        'one-off-event-application-approved': {
          subject:'Event application approved'
        },
        'recurring-event-application-approved': {
          subject:'Event application approved'
        },
        'one-off-event-application-received': {
          subject:'Event application received'
        },
        'recurring-event-application-received': {
          subject:'Event application received'
        },
        'mentor-request-to-join':{
          subject:'New Mentor Request to join your Dojo'
        },
        'google-email-pass':{
          subject:'We created a new Google Email for your Dojo'
        }
      }
    },
    mail: {
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
        // service: 'Gmail',
        // auth: {
        //   user: 'youremail@example.com',
        //   pass: 'yourpass'
        // }
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
    }
  };
}
