'use strict';
module.exports = function customValidatorLogger (ms, cmd, err, args) {
  console.log({
    src: {
      ms: ms,
      cmd: cmd
    },
    err: err,
    args: args
  });
  return JSON.stringify({
    src: {
      ms: ms,
      cmd: cmd
    },
    err: err,
    args: args
  });
};
