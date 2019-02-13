(function () {
  'use strict';

  var seneca = require('seneca');
  var async = require('async');
  var _ = require('lodash');
  /**
   * Retrieve all existing dojos and leads and setup the state and county when the address exists
   * @return 
   * @example curl -d '{"role": "cd-dojos", "cmd":"backfill_dojo_county_state"}' http://localhost:10301/act
   */
  function cmd_backfill_state_county (args, done) {
    var seneca = this;
    function backfillDojo (wfCb) {
      seneca.act({role: 'cd-dojos', cmd: 'list', query: { limit$: 20, alpha2: 'GB' } }, function (err, dojos) {
        async.eachSeries(dojos, function (d, sCb) {
          if (d.geoPoint) {
            geocode(d.geoPoint, function (err, res) {
              var geocoded = res[0];
              // Assign from the bottom up: city -> county (-> state if possible)
              var administrativeLevelsSize = Object.values(geocoded.administrativeLevels).length;
              d.county = {};
              d.state = {};
              var adminLvl1;
              var adminLvl2;
              if (administrativeLevelsSize === 0) { 
                // See https://github.com/nchaulet/node-geocoder/issues/264
                var address_comps = res.raw.results.reduce(function (acc, r) {
                  acc = acc.concat(r.address_components)
                  return acc; 
                }, []);
                adminLvl1 = address_comps.find(function (ac) { return ac.types.indexOf('administrative_area_level_1') > -1 });
                adminLvl2 = address_comps.find(function (ac) { return ac.types.indexOf('administrative_area_level_2') > -1 });
              } 
              if (administrativeLevelsSize > 2 || (adminLvl1 && adminLvl2)) {
                d.county = { name: geocoded.administrativeLevels.level2long || adminLvl2.long_name };
                d.state = {
                  name: geocoded.administrativeLevels.level1long || adminLvl1.long_name,
                  shortCode: geocoded.administrativeLevels.level1short || adminLvl1.short_name,
                };
              } else {
                d.county = { 
                  name: geocoded.administrativeLevels.level1long || adminLvl1.long_name,
                  shortCode: geocoded.administrativeLevels.level1short || adminLvl1.short_name,
                };
              }
              d.city = { name: geocoded.city || geocoded.extra.neighborhood };
              seneca.act({ role: 'cd-dojos', entity: 'dojo', cmd: 'save',
                dojo: { id: d.id, state: d.state, county: d.county, city: d.city }
              }, sCb);
            });
          } else {
            console.log('Missing geoPoint for', d.name, d.id);
            sCb();
          }
        }, wfCb);
      });
    }
    function backfillLead (wfCb) {
      wfCb();
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
