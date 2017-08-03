// Migrate all leads from original format to SADv2
var async = require('async');
var _ = require('lodash');
module.exports = function (args, done) {
  var seneca = this;
  var format = function (lead, cb) {
    var newLead = _.omit(lead, 'application'); // copy over every static non-json-based fields
    delete newLead.dojoId;
    delete newLead.verified;
    newLead.application = {};
    // Default steps statuses
    newLead.application.champion = {
      isValid: false,
      visited: false
    };
    newLead.application.dojo = {
      isValid: false,
      visited: false
    };
    newLead.application.team = {
      isValid: false,
      visited: false
    };
    newLead.application.venue = {
      isValid: false,
      visited: false
    };
    newLead.application.charter = {
      isValid: false,
      visited: false
    };
    if (lead.verified) {
      newLead.completed = true;
    }
    console.log('pre-migrate', newLead);
    async.waterfall([
      migrateDojoListing.bind(this, lead, newLead),
      migrateChampionDetails,
      fillTeam,
      fillCharter
    ], cb);
  };

  function migrateDojoListing (lead, newLead, wfCb) {
    var dojoListing = lead.application.dojoListing;
    var dojo = newLead.application.dojo;
    var venue = newLead.application.venue;
    if (dojoListing) {
      dojo = _.assign(dojo, _.pick(dojoListing, ['email', 'name', 'notes', 'twitter', 'facebook', 'website']));
      dojo.id = lead.dojoId;
      dojo.requestEmail = _.isEmpty(dojo.email);
      dojo.frequency = 'other';
      dojo.alternativeFrequency = dojoListing.time;
      dojo.firstSession = undefined;
      dojo.day = undefined;
      dojo.endTime = undefined;
      dojo.startTime = undefined;
      // TODO : transform FB/twitter
      dojo.twitter = dojo.twitter? (dojo.twitter.indexOf('twitter.com/') > -1 ? dojo.twitter.slice(dojo.twitter.indexOf('twitter.com/') + 12): dojo.twitter ): '';
      dojo.facebook = dojo.facebook ?(dojo.facebook.indexOf('facebook.com/') > -1 ? dojo.facebook.slice(dojo.facebook.indexOf('facebook.com/') + 13): dojo.facebook): '';
      // ??
      dojo.isValid = !!lead.verified; // Cannot be valid anyway, we just ignore it for verified dojo
      dojo.visited = true;

      venue = _.assign(venue, _.pick(dojoListing, ['country', 'place', 'address1']));
      venue.geoPoint = (function (coord) {
        if (coord) {
          var pair = coord.split(',').map(parseFloat);
          if (pair.length === 2 && _.isFinite(pair[0]) && _.isFinite(pair[1])) {
            return {
              lat: pair[0],
              lon: pair[1]
            };
          }
        }
      }(dojoListing.coordinates));

      venue.isFound = !!(venue.geoPoint);
      venue.corporate = undefined;
      venue.alternativeCorporate = undefined;
      venue.type = 'other';
      venue.alternativeType = '';
      venue.private = dojoListing.private || 0;
      venue.isValid = !!lead.verified;
      venue.visited = (dojo.address1 || dojo.geoPoint || dojo.country || dojo.place) || newLead.completed;
    } else {
      venue.private = 0;
      dojo.startTime = undefined;
      dojo.endTime = undefined;
    }
    return wfCb(null, lead, newLead);
  }

  function migrateChampionDetails (lead, newLead, wfCb) {
    var championDetails = lead.application.championDetails;
    var champion = newLead.application.champion;
    seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: lead.userId}, function (err, user) {
      if (err) return wfCb(err);
      if (!user) console.log('Missing profile while migrating champion', lead.userId);
      if (!user) return wfCb(new Error('Missing profile while migrating champion'));
      if (championDetails) {
        // TODO : pull firstName/lastName
        _.merge(champion, _.pick(championDetails, ['email', 'phone']));
        champion.twitter = championDetails.twitter ? (championDetails.twitter.indexOf('twitter.com/') > -1 ? championDetails.twitter.slice(championDetails.twitter.indexOf('twitter.com/') + 12) : championDetails.twitter) : '';
        champion.linkedin = championDetails.linkedin ? (championDetails.linkedin.indexOf('linkedin.com/in/') > -1 ? championDetails.linkedin.slice(championDetails.linkedin.indexOf('linkedin.com/in/') + 16) : championDetails.linkedin) : '';

        // We void the reference to ensure it's something coming from our dropdown instead
        champion.reference = 'other';
        champion.alternativeReference = championDetails.coderDojoReference || '';
        // Default to 1, as from the UI
        champion.confidentMentoring = 1;
        champion.confidentCoding = 1;
        champion.address = championDetails.address1;
        // TODO : condition ?
        champion.parentName = undefined;
        champion.parentEmail = undefined;
        champion.visited = true;
        champion.isValid = !!lead.verified;
      }
      // Default
      champion = _.defaults(champion, _.pick(user, 'email', 'dob', 'firstName', 'lastName', 'phone'));
      champion.twitter = !champion.twitter && user.twitter ? (user.twitter.indexOf('twitter.com/') > -1 ? user.twitter.slice(user.twitter.indexOf('twitter.com/') + 12) : user.twitter) : '';
      champion.linkedin = !champion.linkedin && user.linkedin ? (user.linkedin.indexOf('linkedin.com/in/') > -1 ? user.linkedin.slice(user.linkedin.indexOf('linkedin.com/in/') + 16) : user.linkedin) : '';
      return wfCb(null, newLead, lead);
    });
  }

  // Force fake values to make the "team" step valid
  function fillTeam (newLead, lead, wfCb) {
    newLead.application.team.status = undefined;
    newLead.application.team.isValid = !!lead.verified;
    return wfCb(null, newLead);
  }

  function fillCharter (newLead, wfCb) {
    async.waterfall([
      function getCurrentVersion (_wfCb) {
        seneca.act({role: 'cd-agreements', cmd: 'getVersion'}, function (err, res) {
          if (err) return wfCb(err);
          return _wfCb(null, res.version);
        });
      },
      function getCharter (version, _wfCb) {
        seneca.act({role: 'cd-agreements', cmd: 'list', query: {userId: newLead.userId, agreementVersion: version}}, function (err, agreements) {
          if (err) return wfCb(err);
          return _wfCb(null, agreements);
        });
      },
      function setCharterStepValues (agreements, _wfCb) {
        if (agreements && agreements.length > 0) {
          var agreement = agreements[0];
          newLead.application.charter.fullName = agreement.fullName;
          newLead.application.charter.id = agreement.id;
          newLead.application.charter.isValid = true;
          newLead.application.charter.visited = true;
        }
        return wfCb(null, newLead); // this returns fillCharter, not just the waterfall
      }
    ]);
  }

  var save = function (lead, wfCb) {
    // if (err) return wfCb(err);
    seneca.act({
      role: 'cd-dojos',
      entity: 'lead',
      cmd: 'save',
      lead: lead
    }, function (err) {
      if (err) console.log('ERRRR: ', err, lead.id);
      console.log('saved', lead.id);
      return wfCb(null);
    });
  };

  // List all leads
  seneca.act({
    role: 'cd-dojos',
    entity: 'lead',
    cmd: 'list',
    query: {}
  }, function (err, leads) {
    if (err) return done(err);
    // There is no way to restrict the number of leads as there is no 2 way ref
    seneca.act({role: 'cd-dojos', entity: 'dojo', cmd: 'list', query: {}},
    function (err, dojos) {
      if (err) return done(err);
      // Complete dojoListing with the dojoId
      leads = _.map(leads, function (lead) {
        var dojo = _.find(dojos, {dojoLeadId: lead.id});
        if (dojo) {
          lead.dojoId = dojo.id;
          lead.verified = dojo.verified;
          lead.createdAt = dojo.created;
        }
        return lead;
      });

      // Migrate
      async.eachSeries(leads, function (lead, eCb) {
        async.waterfall([
          format.bind(this, lead),
          save
        ], eCb);
      }, function () {
        console.log('finished');
        done();
      });
    });
  });
};
