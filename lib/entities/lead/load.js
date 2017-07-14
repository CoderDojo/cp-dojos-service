module.exports = function (args, done) {
  var seneca = this;
  var id = args.id;
  seneca.make$('cd/dojoleads').load$({id: id}, done);
};
