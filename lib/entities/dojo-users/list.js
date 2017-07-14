module.exports = function (args, done) {
  var seneca = this;
  var query = args.query;
  seneca.make$('cd/usersdojos').list$(query, done);
}
