#!/usr/bin/env bash

set -e

if [ "$CIRCLE_BRANCH" = "master" ]; then
  DEP_VER=latest
  HOST=$PROD_HOST
  echo "$PROD_CA_CERT" | base64 --decode > ca.pem
  echo "$PROD_ADMIN_KEY" | base64 --decode > admin-key.pem
  echo "$PROD_ADMIN_CERT" | base64 --decode > admin.pem
elif [ "$CIRCLE_BRANCH" = "staging" ]; then
  DEP_VER=staging
  HOST=$STAGING_HOST
  echo "$STAGING_CA_CERT" | base64 --decode > ca.pem
  echo "$STAGING_ADMIN_KEY" | base64 --decode > admin-key.pem
  echo "$STAGING_ADMIN_CERT" | base64 --decode > admin.pem
else
  exit 0
fi
docker build --rm=false --build-arg DEP_VERSION=$DEP_VER -t coderdojo/cp-dojos-service:"$GIT_SHA1" .
docker login -u "$DOCKER_USER" -p "$DOCKER_PASS" -e "$DOCKER_EMAIL"
docker push coderdojo/cp-dojos-service:"$GIT_SHA1"
kubectl config set-cluster default-cluster --server=https://api."$HOST" --certificate-authority=ca.pem
kubectl config set-credentials default-admin --certificate-authority=ca.pem --client-key=admin-key.pem --client-certificate=admin.pem
kubectl config set-context default-system --cluster=default-cluster --user=default-admin
kubectl config use-context default-system
kubectl patch deployment dojos -p '{"spec":{"template":{"spec":{"containers":[{"name":"dojos","image":"coderdojo/cp-dojos-service:'"$GIT_SHA1"'"}]}}}}'
