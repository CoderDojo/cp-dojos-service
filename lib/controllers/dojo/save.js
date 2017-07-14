var async = require('async');
var _ = require('lodash');
var slugify = require('limax');
var purgeEBFields = require('../../utils/dojo/purgeEBFields.js');
var sanitizeHtml = require('sanitize-html');
module.exports = function (args, done) {
  var seneca = this;
  var plugin = args.role;
  var so = seneca.options();
  var dojo = args.dojo;

  function sanitize (sCb) {
    if (dojo.name) dojo.name = sanitizeHtml(dojo.name);
    if (dojo.notes) dojo.notes = sanitizeHtml(dojo.notes, so.sanitizeTextArea);
    if (dojo.countryName) dojo.countryName = sanitizeHtml(dojo.countryName);
    sCb();
  }

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
    if (!dojo.coordinates && dojo.geoPoint) {
      dojo.coordinates = [dojo.geoPoint.lat, dojo.geoPoint.lon];
    }
    sCb();
  }

  function prepareUrlSlug (sCb) {
    var baseSlug = _.chain([
      dojo.alpha2, dojo.admin1Name, dojo.placeName, dojo.name
    ]).compact().map(slugify).value().join('/').toLowerCase();
    var query = {urlSlug: new RegExp('^' + baseSlug, 'i')};
    seneca.act({role: plugin, entity: 'dojo', cmd: 'list', query: query}, function (err, dojos) {
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
    seneca.act({role: 'cd-dojos', entity: 'dojo', cmd: 'save', dojo: dojo}, sCb);
  }

  async.series([
    sanitize,
    prepareCoordinates,
    prepareUrlSlug,
    saveDojo
  ], function (err, results) {
    var savedDojo = _.last(results);

    done(null, purgeEBFields(savedDojo));
  });
};
