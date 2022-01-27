# cp-dojos-service

## About

This is the Dojos service, a backend repository of the [CoderDojo Zen Community Platform](https://github.com/CoderDojo/community-platform) project. The service looks after the Dojos (coding club) section of the API (anything to do with retrieving data/information to do with Dojos).

If you want to get set up to make a backend contribution, please see the [cp-local-development repository](https://github.com/CoderDojo/cp-local-development).

General documentation is in the [community-platform repository](https://github.com/CoderDojo/community-platform).

## Google Maps API key for development

This service needs a Google Maps API key for geolating dojos.  It is set by the environment variable `GOOGLE_MAPS_KEY`.  You should have this in your environment before starting the service.  If you're using the `cp-local-development` repo, you should put it in your `.env` file in that repo before starting the containers.

Rather than share our dev API key here in the repo, you should set up your own key [on the Google Maps API console](https://console.cloud.google.com/google/maps-apis/credentials).  For engineers at the RPF, we have a key there called `Backend Dev Api Key`, and you should add your IP address to the list of permitted addresses there.

**NB** Do not add it to `config/development.env` as you may end up accidentally commiting your key.

