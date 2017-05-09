'use strict';

module.exports = function (seneca) {
  seneca.listen()
    .client({type: 'web', port: 10303, pin: {role: 'cd-users', cmd: '*'}})
    .client({type: 'web', port: 10303, pin: {role: 'cd-agreements', cmd: '*'}})
    .client({type: 'web', port: 10303, pin: {role: 'cd-profiles', cmd: '*'}})
    .client({type: 'web', port: 10303, pin: {role: 'cd-user-profile', cmd: '*'}})
    .client({type: 'web', port: 10304, pin: {role: 'cd-salesforce', cmd: '*'}})
    .client({type: 'web', port: 10306, pin: {role: 'cd-events', cmd: '*'}})
    .client({type: 'web', port: 10309, pin: {role: 'cd-organisations', cmd: '*'}});
};
