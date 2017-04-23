var async = require('async');
var _ = require('lodash');
var sanitizeHtml = require('sanitize-html');
/**
 * Save a lead and all its dependencies
 * Dependencies being : champion profile, dojo, charter
 * @param  {Object}   args lead
 */
 // TODO : perm : dojo is not verified, dojo is own, dojo etc, isSelf (lead.userId = args.userId)
 // TODO : wrapCheckRateLimitCreateDojo
module.exports = function (args, done) {
  var seneca = this;
  var lead = args.lead;
  var originalLead;
  var plugin = args.role;

  function limitConcurrentLead (cb) {
    if (!lead.id) { // Check in case of creation that there is no other awaiting lead
      seneca.act({role: plugin, entity: 'lead', cmd: 'list', query :{userId: lead.userId}},
      function (err, leads) {
        seneca.act({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list', query : { userId: args.user.id}},
        function (err, userOrgs) {
          if (leads.length > 0 && !userOrgs.length) {
            return done(new Error('Cannot start a dojo while another is awaiting approval'));
          } else {
            cb();
          }
        });
      })
    }
  }

  function getOriginalApplication (cb) {
    if (lead.id) {
      seneca.act({role: plugin, entity: 'lead', cmd: 'load', id: lead.id}, function (err, foundLead) {
        if (err) return done(err);
        originalLead = foundLead;
        cb();
      });
    } else {
      cb();
    }
  }

  function securityChecks (cb) {
    if (originalLead) {
      if (lead.userId !== originalLead.userId) return done('You cannot change the lead user of an application');
      if (lead.dojo && originalLead.dojo && lead.dojo.id !== originalLead.dojo.id) return done('You cannot change the lead dojo of an application');
    }
    cb();
  }

  function saveLead (cb) {
    seneca.act({role: plugin, entity: 'lead', cmd: 'save', dojoLead: lead}, function (err, savedLead) {
      if (err) return done(err);
      lead = savedLead;
      return cb();
    });
  }

  function updateChampionProfile (cb) {
    var championApplication = _.clone(lead.application.champion);
    delete championApplication.isValid;
    if (!_.isEmpty(championApplication)) { // It shouldn't happen, except if the user starts the stepper on a page != 1
      seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: lead.userId}, function (err, profile) {
        if (err) return cb(err);
        _.merge(profile, championApplication);
        delete profile.confidentMentoring;
        delete profile.confidentCoding;
        seneca.act({role: 'cd-profiles', cmd: 'save', profile: profile}, cb);
      });
    }
  }

  // You'll not necessarly have a dojo created if you didn't filled yet dojo informations
  // So we check if it exists first to extend it
  function updateDojo (cb) {
    var dojoApplication = _.clone(lead.application.dojo);
    delete dojoApplication.isValid;
    dojoApplication.verified = 0; // Enforce verification is not done through this process
    function getDojo (sCb) {
      if (dojoApplication.id) {
        seneca.act({role: 'cd-dojos', cmd: 'load', id: dojoApplication.id}, function (err, dojo) {
          if (err) return done(err);
          _.merge(dojo, dojoApplication);
          sCb();
        });
      } else {
        sCb();
      }
    }
    function saveDojo (sCb) {
      if (dojoApplication.name) dojoApplication.name = sanitizeHtml(dojoApplication.name);
      if (dojoApplication.countryName) dojoApplication.countryName = sanitizeHtml(dojoApplication.countryName);
      if (dojoApplication.notes) dojoApplication.notes = sanitizeHtml(dojoApplication.notes, so.sanitizeTextArea);
      seneca.act({role: 'cd-dojos', cmd: 'save'}, {dojo: dojoApplication}, sCb);
    }

    if (!_.isEmpty(dojoApplication)) {
      async.series([
        getDojo,
        saveDojo
      ], cb);
    } else {
      cb();
    }
  }

  function handleCharter (cb) {
    var charterApplication = _.clone(lead.application.charter);
    delete charterApplication.isValid;
    var charterExists = false;
    function getCharter (sCb) {
      if (charterApplication.id) {
        // NOTE : there may be an issue here as the looked up version is defined by the front rather than an cdf
        seneca.act({role: 'cd-charter', cmd: 'list', query: {id: charterApplication.id,
           version: charterApplication.version, userId: lead.userId}}, function (err, charters) {
          if (err) return done(err);
          if (charters.length > 0) charterExists = true;
          return sCb();
        });
      } else {
        return sCb();
      }
    }
    function saveCharter (sCb) {
      if (!charterExists) {
        seneca.act({role: 'cd-charter', cmd: 'save'}, {charter: charterApplication}, sCb);
      } else {
        return sCb();
      }
    }

    if (!_.isEmpty(charterApplication)) {
      async.series([
        getCharter,
        saveCharter
      ], cb);
    } else {
      cb();
    }
  }

  async.series([
    getOriginalApplication,
    securityChecks,
    saveLead,
    updateChampionProfile,
    updateDojo,
    handleCharter
  ], function (err, results) {
    if (err) return done(err);
    return done(null, lead);
  });
};
