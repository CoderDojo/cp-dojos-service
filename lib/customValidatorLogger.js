'use strict';
module.exports = function customValidatorLogger (ms, cmd, err, args) {
  return JSON.stringify({
    src: {
      ms: ms,
      cmd: cmd
    },
    err: err,
    args: args
  });
};
