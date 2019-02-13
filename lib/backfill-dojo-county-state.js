(function () {
  'use strict';

  var seneca = require('seneca');
  var async = require('async');
  /**
   * Retrieve all existing dojos and leads and setup the state and county when the address exists
   * @return 
   * @example curl -d '{"role": "cd-dojos", "cmd":"backfill_dojo_county_state"}' http://localhost:10301/act
   */
  function cmd_backfill_state_county (args, done) {
    var seneca = this;
    function backfillDojo (wfCb) {
      console.time('backfill_dojos');
      seneca.act({role: 'cd-dojos', cmd: 'list', query: { } }, function (err, dojos) {
        async.eachSeries(dojos, function (d, sCb) {
          if (d.geoPoint) {
            geocode(d.geoPoint, function (err, res) {
              if (err) return done(err);
              d = formatGeocoded(d, res);
              seneca.act({ role: 'cd-dojos', entity: 'dojo', cmd: 'save',
                dojo: { id: d.id, state: d.state, county: d.county, city: d.city }
              }, sCb);
            });
          } else {
            // This isn't normal but we can't care for this scenario
            // Blame somebody else
            // console.log('Missing geoPoint for', d.name, d.id);
            sCb();
          }
        }, function (err) {
          if (err) done(err);
          console.timeEnd('backfill_dojos');
        });
      });
      // Early return to avoid seneca's timeout
      wfCb();
    }
    function backfillLead (wfCb) {
      console.time('backfill_leads');
      seneca.act({role: 'cd-dojos', entity: 'lead', cmd: 'list', query: { } }, function (err, leads) {
        async.eachSeries(leads, function (l, sCb) {
          if (l.application && l.application.venue && l.application.venue.geoPoint) {
            var venue = l.application.venue || { isValid: false, visited: false };
            geocode(venue.geoPoint, function (err, res) {
              if (err) return done(err);
              venue = formatGeocoded(venue, res);
              seneca.act({ role: 'cd-dojos', entity: 'lead', cmd: 'save',
                dojoLead: { id: l.id, application: l.application }
              }, sCb);
            });
          } else {
            // It's fine, it's optional at that stage
            // console.log('Missing geoPoint for lead ', l.email, l.id);
            sCb();
          }
        }, function (err) {
          if (err) done(err);
          console.timeEnd('backfill_leads');
        });
      });
      // Early return to avoid seneca's timeout
      wfCb();
    }
    function formatGeocoded(entity, res) {
      if (res.error) {
        if (res.error.message = 'Status is ZERO_RESULTS.') {
          return entity;
        }
        throw res.error;
      }
      var geocoded = res[0];
      // Assign from the bottom up: city -> county (-> state if possible)
      var administrativeLevelsSize = Object.values(geocoded.administrativeLevels).length;
      entity.county = {};
      entity.state = {};
      var adminLvl1 = {};
      var adminLvl2 = {};
      if (administrativeLevelsSize === 0) { 
        // See https://github.com/nchaulet/node-geocoder/issues/264
        var address_comps = res.raw.results.reduce(function (acc, r) {
          acc = acc.concat(r.address_components)
          return acc; 
        }, []);
        adminLvl1 = address_comps.find(function (ac) { return ac.types.indexOf('administrative_area_level_1') > -1 });
        adminLvl2 = address_comps.find(function (ac) { return ac.types.indexOf('administrative_area_level_2') > -1 });
      } 
      if ((geocoded.administrativeLevels.level2long && geocoded.administrativeLevels.level1long) || (adminLvl1 && adminLvl2)) {
        entity.county = { name: geocoded.administrativeLevels.level2long || adminLvl2.long_name };
        entity.state = {
          name: geocoded.administrativeLevels.level1long || adminLvl1.long_name,
          shortCode: geocoded.administrativeLevels.level1short || adminLvl1.short_name,
        };
      } else if (geocoded.administrativeLevels.level1long || geocoded.administrativeLevels.level2long) {
        entity.county = { 
          name: geocoded.administrativeLevels.level1long || adminLvl1.long_name || geocoded.administrativeLevels.level2long,
          shortCode: geocoded.administrativeLevels.level1short || adminLvl1.short_name || geocoded.administrativeLevels.level2short,
        };
      }
      entity.city = { name: geocoded.city || geocoded.extra.neighborhood };
      return entity; 
    } 
    function geocode(coords, cb) {
      seneca.act({role: 'cd-dojos', cmd: 'reverse_geocode', coords, raw: true }, cb);
    }
    async.parallel([
      backfillDojo,
      backfillLead,
    ], function (err){
      console.log('done');
      if (err) return done(err);
      return done();
    });
  }

  module.exports = cmd_backfill_state_county;
})();
