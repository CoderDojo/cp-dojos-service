module.exports = function (args, done) {
  var seneca = this;
  seneca.make$('cd/dojos').save$(args.dojo, done);
};
