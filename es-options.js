module.exports = {
  refreshOnSave : true,
  entities: [{
    base: 'cd',
    name: 'dojos',
    indexedAttributes: {
      'id': {
        type: 'string',
        index: 'not_analyzed'
      },
      'name': true,
      'creator': true,
      'created': true,
      'verifiedAt': true,
      'verifiedBy': true,
      'verified': true,
      'needMentors': true,
      'stage': true,
      'time': true,
      'country': true,
      'county': true,
      'state': true,
      'city': true,
      'place': true,
      'location': true,
      'coordinates': true,
      'geoPoint': {
        type: 'geo_point'
      },
      'notes': true,
      'email': true,
      'website': true,
      'twitter': true,
      'google_group': true,
      'ebId': true,
      'supporterImage': true,
      'private': true,
      'urlSlug': true,
      'continent': true,
      'alpha2': true,
      'alpha3': true,
      'address1': true,
      'address2': true,
      'countryNumber': true,
      'countryName': true,
      'admin1Code': true,
      'admin1Name': true,
      'admin2Code': true,
      'admin2Name': true,
      'admin3Code': true,
      'admin3Name': true,
      'admin4Code': true,
      'admin4Name': true,
      'placeGeonameId': true,
      'placeName': true
    }
  }]
};