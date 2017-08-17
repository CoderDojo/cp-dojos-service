module.exports = function (args, done) {
  var seneca = this;
  var query = args.query;
  seneca.make$('v_dojoleads').list$(query, done);
};
