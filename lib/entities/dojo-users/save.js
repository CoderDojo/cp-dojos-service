module.exports = function (args, done) {
  var seneca = this;
  var userdojo = args.userdojo;
  seneca.make$('cd/usersdojos').save$(userdojo, done);
};
