#! /usr/bin/env sh
cd /usr/src/app || exit
if [ ! -d "node_modules" ]; then
  npm install
  rm -rf node_modules/cp-translations
  ln -s /usr/src/cp-translations node_modules/cp-translations
fi
nodemon service.js
