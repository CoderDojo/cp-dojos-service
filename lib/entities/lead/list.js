module.exports = function (args, done) {
  var seneca = this;
  var query = args.query;
  seneca.make$('cd/dojoleads').list$(query, done);
};
