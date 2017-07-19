FROM mhart/alpine-node:0.10.48
MAINTAINER butlerx <butlerx@notthe.cloud>

RUN apk add --update git python build-base postgresql-client openssl && \
    mkdir -p /usr/src/app
WORKDIR /usr/src/app
ADD . /usr/src/app/
ENV DEP_VERSION=latest
RUN npm install && \
    npm install cp-translations@$DEP_VERSION && \
    apk del build-base python && \
    rm -rf /tmp/* /root/.npm /root/.node-gyp
EXPOSE 10301
CMD ["node", "service.js"]
