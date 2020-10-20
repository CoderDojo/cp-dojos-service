var async = require('async');
var _ = require('lodash');
var cleanDojoLead = require('../../utils/dojo/lead/cleanDojoLead');
var cleanLeadStep = require('../../utils/dojo/lead/cleanLeadStep');
/**
 * Save a lead and all its dependencies
 * Dependencies being : champion profile, dojo, charter
 * @param  {Object}   args lead
 */
module.exports = function (args, done) {
  var seneca = this;
  var lead = args.lead;
  var originalLead;
  var plugin = args.role;
  var user = args.user;

  // Only members of an organisations are allowed to have multiple non-completed leads
  // TODO : move to a separate perm to allow bypass by CDF
  function limitConcurrentLead (cb) {
    // Get all leads for the user, even the submitted ones (completed)
    function getLeads (wfCb) {
      seneca.act({role: plugin, entity: 'lead', cmd: 'list', query: {userId: user.id, deleted: 0}},
      function (err, leads) {
        if (err) return done(err);
        wfCb(null, leads);
      });
    }
    // Filter all leads that are verified
    function getLeadsDojos (leads, wfCb) {
      if (leads && leads.length > 0) {
        seneca.act({role: plugin, entity: 'dojo', cmd: 'list', query: {dojoLeadId: {in$: _.map(leads, 'id')}}},
        function (err, dojos) {
          if (err) return done(err);
          var mergedList = _.map(leads, function (lead) {
            var dojo = _.find(dojos, { dojoLeadId: lead.id });
            if (dojo) {
              if (dojo.verified || dojo.deleted) lead = undefined;
              if (!dojo.verified) lead.dojo = dojo;
            }
            return lead;
          });
          wfCb(null, _.compact(mergedList));
        });
      } else {
        wfCb(null, leads);
      }
    }
    // Count filtered leads (non-verified leads) to check if user is able to continue
    function checkConcurrentLeads (leads, wfCb) {
      if (!leads && !lead.id) return cb(); // new lead
      if (leads.length === 1 && leads[0].id === lead.id) return cb(); // The user is updating the current lead
      seneca.act({role: 'cd-organisations', ctrl: 'userOrg', cmd: 'list', query: {userId: user.id}},
      function (err, userOrgs) {
        if (leads.length >= 1 && !userOrgs.length) {
          return done(new Error('Cannot start a dojo while another is awaiting approval'));
        } else {
          cb();
        }
      });
    }

    // cb is called in the last step, checkConcurrentLeads
    async.waterfall(
      [getLeads,
      getLeadsDojos,
      checkConcurrentLeads]
    );
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
      if (lead.userId && lead.userId !== originalLead.userId) return done(new Error('You cannot change the lead user of an application'));
      if (lead.application.dojo && originalLead.application.dojo &&
         (lead.application.dojo.id !== originalLead.application.dojo.id)) {
        return done(new Error('You cannot change the lead dojo of an application'));
      }
      if ((lead.application.champion && originalLead.application.champion) &&
         (lead.application.champion.id !== originalLead.application.champion.id) &&
         (lead.application.champion.id !== lead.application.userId)) {
        return done(new Error('Champion Id doesn\'t match userId'));
      }
    }
    cb();
  }

  function saveLead (cb) {
    lead.deleted = 0; // Force value for unit test validity
    // Force value to avoid self-validation
    lead.completed = false;
    lead.completedAt = null;
    // This defaults allows CDF to still save a lead without overwriting ownership
    lead.userId = originalLead ? originalLead.userId : user.id;
    lead.email = originalLead ? originalLead.email : user.email;
    seneca.act({role: plugin, entity: 'lead', cmd: 'save', dojoLead: lead}, function (err, savedLead) {
      if (err) return done(err);
      lead = savedLead;
      return cb();
    });
  }

  function updateChampionProfile (cb) {
    var championApplication = _.clone(lead.application.champion);
    championApplication = cleanLeadStep(championApplication);
    if (!_.isEmpty(championApplication)) { // It shouldn't happen
      seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: lead.userId}, function (err, profile) {
        if (err) return done(err);
        var fields = ['id', 'firstName', 'lastName', 'name', 'phone', 'email'];
        _.merge(profile, _.pick(championApplication, fields));
        seneca.act({role: 'cd-profiles', cmd: 'save', profile: _.pick(profile, fields)}, cb);
      });
    } else {
      cb();
    }
  }

  // You'll not necessarly have a dojo created if you didn't filled yet dojo informations
  // So we check if it exists first to extend it
  function updateDojo (cb) {
    var dojoApplication = _.cloneDeep(lead.application.dojo);

    function getDojo (sCb) {
      if (dojoApplication.id) {
        seneca.act({role: 'cd-dojos', cmd: 'load', id: dojoApplication.id}, function (err, dojo) {
          if (err) return done(err);
          if (!dojo) return done(new Error('Dojo not found'));
          // Ensure that we don't overwrite an existing/verified dojo with a less strict process
          if (!dojo.verified && !dojo.deleted) {
            sCb();
          } else {
            return done(new Error('Cannot update a verified/deleted dojo through lead'));
          }
        });
      } else {
        sCb();
      }
    }
    function saveDojo (sCb) {
      // Allow CDF to save for another user
      dojoApplication.creator = lead.userId || user.id;
      dojoApplication.creatorEmail = lead.email || user.email;
      dojoApplication.stage = 0;
      dojoApplication.deleted = 0;
      dojoApplication.verified = 0; // Enforce verification is not done through this process
      dojoApplication.dojoLeadId = lead.id;
      // Unpack locality info into the root structure of the dojo
      if (lead.application.venue) {
        dojoApplication.private = lead.application.venue.private;
        dojoApplication.onlineSessions = lead.application.venue.onlineSessions == 1 ? 1 : 0;
        if (lead.application.venue.geoPoint) dojoApplication.geoPoint = lead.application.venue.geoPoint;
        if (lead.application.venue.state) dojoApplication.state = lead.application.venue.state;
        if (lead.application.venue.country) dojoApplication.country = lead.application.venue.country;
        if (lead.application.venue.county) dojoApplication.county = lead.application.venue.county;
        if (lead.application.venue.city) dojoApplication.city = lead.application.venue.city;
        if (lead.application.venue.country) {
          if (lead.application.venue.country.alpha2) dojoApplication.alpha2 = lead.application.venue.country.alpha2;
          if (lead.application.venue.country.alpha3) dojoApplication.alpha3 = lead.application.venue.country.alpha3;
          if (lead.application.venue.country.countryName) dojoApplication.countryName = lead.application.venue.country.countryName;
          if (lead.application.venue.country.continent) dojoApplication.continent = lead.application.venue.country.continent;
          if (lead.application.venue.country.countryNumber) dojoApplication.countryNumber = lead.application.venue.country.countryNumber;
        }
        if (lead.application.venue.address1) dojoApplication.address1 = lead.application.venue.address1;
        if (lead.application.venue.address2) dojoApplication.address2 = lead.application.venue.address2;
        if (lead.application.venue.place) {
          dojoApplication.placeName = lead.application.venue.place.nameWithHierarchy || lead.application.venue.place.toponymName;
          dojoApplication.place = lead.application.venue.place;
        }
        if (lead.application.venue.safeguardingSponsorName) dojoApplication.safeguardingSponsorName = lead.application.venue.safeguardingSponsorName;
        if (lead.application.venue.safeguardingSponsorEmail) dojoApplication.safeguardingSponsorEmail = lead.application.venue.safeguardingSponsorEmail;
      }
      seneca.act({role: 'cd-dojos', ctrl: 'dojo', cmd: 'save', dojo: dojoApplication}, function (err, dojo) {
        if (err) return done(err);
        lead.application.dojo.id = dojo.id;
        sCb();
      });
    }

    // The minimal dojo payload should have a name, this is a db constraint I don't feel like removing
    if (!_.isEmpty(dojoApplication) && dojoApplication.name) {
      // We remove fields which belongs to the lead itself and not to a dojo anymore
      dojoApplication = cleanDojoLead(cleanLeadStep(dojoApplication));
      async.series([
        getDojo,
        saveDojo
      ], cb);
    } else {
      cb();
    }
  }

  function handleCharter (cb) {
    var charterApplication = _.cloneDeep(lead.application.charter);
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
      if (!charterExists && charterApplication.fullName) {
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
      charterApplication = cleanLeadStep(charterApplication);
      async.series([
        getCharter,
        saveCharter
      ], cb);
    } else {
      cb();
    }
  }

  // Don't be fooled, order matter here, see comment
  async.series([
    limitConcurrentLead,
    getOriginalApplication,
    securityChecks,
    saveLead,
    updateChampionProfile,
    handleCharter,
    updateDojo, // Must be done post saveLead so that the leadId exists,
    saveLead // save Ids
  ], function (err, results) {
    if (err) return done(err);
    return done(null, lead);
  });
};
