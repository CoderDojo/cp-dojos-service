module.exports = {
  refreshOnSave : true,
  indexConfig :{
    settings: {
      index: {
        analysis :{
          analyzer: {
            email: {
              type : 'custom',
              tokenizer : 'uax_url_email',
              filter : ['standard', 'lowercase', 'stop']
            },
            sort: {
              type: 'custom',
              tokenizer: 'keyword',
              filter: 'lowercase'
            }
          }
        }
      }
    }
  },
  entities: [{
    base: 'cd',
    name: 'dojos',
    indexedAttributes: {
      'id': {
        type: 'string',
        index: 'not_analyzed'
      },
      'name': {
        'type': 'string',
        'fields': {
          'raw': {'type': 'string', analyzer: 'sort'}
        }
      },
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
      'email': {
        'analyzer': 'email',
        'type': 'string'
      },
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