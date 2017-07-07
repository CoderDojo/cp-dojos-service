FROM mhart/alpine-node:0.10.48
MAINTAINER butlerx <butlerx@notthe.cloud>

RUN apk add --update git python build-base postgresql-client openssl && \
    npm install -g nodemon && \
    mkdir -p /usr/src/app /usr/src/cp-translations
ADD docker-entrypoint.sh /usr/src
VOLUME /usr/src/app /usr/src/cp-translations
EXPOSE 10301
CMD ["/usr/src/docker-entrypoint.sh"]
