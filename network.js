'use strict';

module.exports = function (seneca) {
  seneca.listen()
    .client({
      type: 'web',
      host: process.env.CD_USERS || 'localhost',
      port: 10303,
      pin: {
        role: 'cd-users',
        cmd: '*'
      }
    })
    .client({
      type: 'web',
      host: process.env.CD_USERS || 'localhost',
      port: 10303,
      pin: {
        role: 'cd-agreements',
        cmd: '*'
      }
    })
    .client({
      type: 'web',
      host: process.env.CD_USERS || 'localhost',
      port: 10303,
      pin: {
        role: 'cd-profiles',
        cmd: '*'
      }
    })
    .client({
      type: 'web',
      host: process.env.CD_USERS || 'localhost',
      port: 10303,
      pin: {
        role: 'cd-user-profiles',
        cmd: '*'
      }
    })
    .client({
      type: 'web',
      host: process.env.CD_EVENTS || 'localhost',
      port: 10306,
      pin: {
        role: 'cd-events',
        cmd: '*'
      }
    });
};
