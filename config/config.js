
module.exports = function() {

  // Utility function for local development running with boot2docker
  // where we need the ip address of boot2docker instead of localhost.
  // This is for accessing containerised services.
  function localhost() {
    if (process.env.DOCKER_HOST) {
      return require('url').parse(process.env.DOCKER_HOST).hostname;
    }
    if (process.evn.TARGETIP) {
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
        host : localhost() + ':9200',
        index: process.env.ES_INDEX,
        sniffOnStart: false
      }
    };
  }

  return {
    'postgresql-store': pgConfig(),
    elasticsearch: esConfig(),
    transport: {
      type: 'web',
      web: {
        host: '0.0.0.0',
        port: 10301
      }
    }
  };
}
