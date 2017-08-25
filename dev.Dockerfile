FROM mhart/alpine-node:0.10.48
MAINTAINER butlerx <butlerx@notthe.cloud>
WORKDIR /usr/src/app
ENV NODE_ENV development
RUN apk add --update git python build-base postgresql-client && \
    mkdir -p /usr/src/app /usr/src/cp-translations
COPY docker-entrypoint.sh /usr/src
VOLUME /usr/src/app /usr/src/cp-translations
EXPOSE 10301
CMD ["/usr/src/docker-entrypoint.sh"]
