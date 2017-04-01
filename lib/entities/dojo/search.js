// TODO: separate perm
// TODO: use generic bootloader
module.exports = function () {
  return function (args, cb) {
    var seneca = this;
    seneca.make$('cd/dojos').list$(args.query, cb);
  };
};
