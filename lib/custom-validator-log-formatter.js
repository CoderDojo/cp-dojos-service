'use strict';
module.exports = function customValidatorLogFormatter (ms, cmd, err, args) {
  return JSON.stringify({
    src: {
      ms: ms,
      cmd: cmd
    },
    err: err,
    args: args
  });
};
