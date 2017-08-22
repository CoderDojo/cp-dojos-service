#!/usr/bin/env bash

set -e

if [ "$CIRCLE_BRANCH" = "master" ]; then
  DEP_VER=latest
  HOST=$PROD_HOST
  CA_CERT=$PROD_CA_CERT
  ADMIN_CERT=$PROD_ADMIN_CERT
  ADMIN_KEY=$PROD_ADMIN_KEY
elif [ "$CIRCLE_BRANCH" = "staging" ]; then
  DEP_VER=staging
  HOST=$STAGING_HOST
  CA_CERT=$STAGING_CA_CERT
  ADMIN_CERT=$STAGING_ADMIN_CERT
  ADMIN_KEY=$STAGING_ADMIN_KEY
else
  exit 0
fi
docker build --rm=false --build-arg DEP_VERSION=$DEP_VER -t coderdojo/cp-dojos-service:"$GIT_SHA1" .
docker login -u "$DOCKER_USER" -p "$DOCKER_PASS" -e "$DOCKER_EMAIL"
docker push coderdojo/cp-dojos-service:"$GIT_SHA1"
mkdir -p ~/.kube
echo "apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: $CA_CERT
    server: https://api.$HOST
  name: default-cluster
contexts:
- context:
    cluster: default-cluster
    user: default-admin
  name: default-system
current-context: default-system
kind: Config
preferences: {}
users:
- name: default-admin
  user:
    client-certificate-data: $ADMIN_CERT
    client-key-data: $ADMIN_KEY" > ~/.kube/config
kubectl patch deployment dojos -p '{"spec":{"template":{"spec":{"containers":[{"name":"dojos","image":"coderdojo/cp-dojos-service:'"$GIT_SHA1"'"}]}}}}'
