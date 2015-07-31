FROM mhart/alpine-node:0.10
MAINTAINER nearForm <info@nearform.com>

RUN apk-install git make gcc g++ python postgresql-client
  
RUN mkdir -p /usr/src/app /usr/src/app/config /usr/src/app/email-templates /usr/src/app/data /usr/src/app/scripts
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install --production 
COPY config /usr/src/app/config/
COPY data /usr/src/app/data/
COPY scripts /usr/src/app/scripts/
COPY email-templates /usr/src/app/email-templates/
COPY *.js /usr/src/app/  

RUN apk del make gcc g++ python && rm -rf /tmp/* /root/.npm /root/.node-gyp
