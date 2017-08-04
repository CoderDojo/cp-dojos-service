var mocks = {};
var _ = require('lodash');
/**
 * Return a predefined value for an act
 * Multiple calls to the mocks will return the n-th stored result
 * @param  {Object|String} pattern the seneca pattern
 * @param  {Object} result  The wanted result for the associated pattern
 * @return {Object}         result || dynamic value
 */

// TODO: mocking an act on a same microservice than the one tested seems not to work
module.exports = function (seneca) {
  return function (pattern, result) {
    var role = pattern.role;
    var cmd = pattern.cmd;
    if (!mocks[role]) mocks[role] = {};
    if (!mocks[role][cmd]) mocks[role][cmd] = [];
    mocks[role][cmd].push(result);
    // We use the pattern to allow us to map the result to any act type (ctrl, entity)
    // Because the matching of the pattern is done upon the most complex
    // But the mocks are only stored by role/cmd as keys for simplicity sake
    seneca.add(pattern, function (args, done) {
      if (mocks[role] && mocks[role][cmd] && mocks[role][cmd][0]) {
        var res = mocks[role][cmd][0];
        mocks[role][cmd].shift();
        if (_.isFunction(res)) {
          res();
        } else {
          return done(null, res);
        }
      }
      return this.prior(args, done);
    });
  };
};
