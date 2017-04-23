var async = require('async');
var _ = require('lodash');
var slugify = require('limax');
var sanitizeHtml = require('sanitize-html');
module.exports = function (args, done) {
  var seneca = this;
  var dojo = args.dojo;

  function prepareCoordinates (sCb) {
    if (!dojo.geoPoint && dojo.coordinates) {
      var pair = dojo.coordinates.split(',').map(parseFloat);
      if (pair.length === 2 && _.isFinite(pair[0]) && _.isFinite(pair[1])) {
        dojo.geoPoint = {
          lat: pair[0],
          lon: pair[1]
        };
      }
    }
    sCb();
  }

  function prepareUrlSlug (sCb) {
    var baseSlug = _.chain([
      dojo.alpha2, dojo.admin1Name, dojo.placeName, dojo.name
    ]).compact().map(slugify).value().join('/').toLowerCase();
    var urlSlug = {urlSlug: new RegExp('^' + baseSlug, 'i')};
    seneca.make$('cd/dojos').list$(urlSlug, function (err, dojos) {
      if (err) return done(err);

      var urlSlugs = {};
      if (_.isEmpty(dojos)) {
        dojo.urlSlug = baseSlug;
        return sCb();
      }

      urlSlugs = _.map(dojos, 'urlSlug');
      var urlSlug = baseSlug;
      for (var idx = 1; urlSlugs.indexOf(urlSlug) !== -1; urlSlug = baseSlug + '-' + idx, idx++);
      dojo.urlSlug = urlSlug;
      sCb();
    });
  }

  function saveDojo (sCb) {
    if (dojo.name) dojo.name = sanitizeHtml(dojo.name);
    if (dojo.notes) dojo.notes = sanitizeHtml(dojo.notes);
    if (dojo.countryName) dojo.countryName = sanitizeHtml(dojo.countryName);
    seneca.act({role: 'cd-dojos', entity: 'dojo', cmd: 'save', dojo: dojo}, sCb);
  }

  async.series([
    prepareCoordinates,
    prepareUrlSlug,
    saveDojo
  ], function (err, results) {
    var savedDojo = _.last(results);
    done(null, savedDojo);
  });
};
