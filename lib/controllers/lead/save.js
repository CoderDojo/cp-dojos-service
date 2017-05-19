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
  var so = seneca.options();
  var lead = args.lead;
  var originalLead;
  var plugin = args.role;
  var user = args.user;

  // Only members of an organisations are allowed to have multiple non-completed leads
  function limitConcurrentLead (cb) {
    if (!lead.id) {
      seneca.act({role: plugin, entity: 'lead', cmd: 'list', query: {userId: lead.userId, completed: false}},
      function (err, leads) {
        if (leads.length === 1 && leads[0].id === lead.id) return cb(); // The user is updating a current lead
        seneca.act({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list', query: {userId: args.user.id}},
        function (err, userOrgs) {
          if (leads.length > 0 && !userOrgs.length) {
            return done(new Error('Cannot start a dojo while another is awaiting approval'));
          } else {
            cb();
          }
        });
      });
    } else {
      cb();
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

  function updateChampionProfile (cb) {
    var championApplication = _.clone(lead.application.champion);
    delete championApplication.isValid;
    if (!_.isEmpty(championApplication)) { // It shouldn't happen, except if the user starts the stepper on a page != 1
      seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: lead.userId}, function (err, profile) {
        if (err) return done(err);
        _.merge(profile, championApplication);
        delete profile.confidentMentoring;
        delete profile.confidentCoding;
        delete profile.reference;
        delete profile.alternativeReference;
        seneca.act({role: 'cd-profiles', cmd: 'save', profile: profile}, cb);
      });
    } else {
      cb();
    }
  }

  // You'll not necessarly have a dojo created if you didn't filled yet dojo informations
  // So we check if it exists first to extend it
  function updateDojo (cb) {
    var dojoApplication = _.clone(lead.application.dojo);
    var applicationKeys = _.keys(dojoApplication);
    // We remove fields which belongs to the lead itself and not to a dojo anymore
    // TODO : pick instead? normally joi is avoiding us bypassing processes but still ?
    delete dojoApplication.isValid;
    delete dojoApplication.firstSession;
    delete dojoApplication.frequency;
    delete dojoApplication.requestEmail;
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
      dojoApplication.verified = 0; // Enforce verification is not done through this process
      seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'save', dojo: dojoApplication}, function (err, dojo) {
        if (err) return done(err);
        // lead.application.dojo = _.pick(dojo, applicationKeys);
        sCb();
      });
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
        seneca.act({role: 'cd-agreements', cmd: 'getVersion'}, function (err, response) {
          if (err) return done(err);
          var version = response.version;
          seneca.act({role: 'cd-agreements', cmd: 'list',
            query: {
              id: charterApplication.id,
              agreementVersion: version,
              userId: lead.userId}},
            function (err, charters) {
              if (err) return done(err);
              if (charters.length > 0) charterExists = true;
              return sCb();
            });
        });
      } else {
        return sCb();
      }
    }
    function saveCharter (sCb) {
      if (!charterExists) {
        seneca.act({role: 'cd-agreements', cmd: 'save', agreement: charterApplication, user: user},
        function (err, charter) {
          if (err) return done(err);
          lead.application.charter = charter;
          sCb();
        });
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

  function saveLead (cb) {
    seneca.act({role: plugin, entity: 'lead', cmd: 'save', dojoLead: lead}, function (err, savedLead) {
      if (err) return done(err);
      lead = savedLead;
      return cb();
    });
  }

  async.series([
    limitConcurrentLead,
    getOriginalApplication,
    securityChecks,
    updateChampionProfile,
    updateDojo,
    handleCharter,
    saveLead // Last so we can save previous ids into it
  ], function (err, results) {
    if (err) return done(err);
    return done(null, lead);
  });
};
