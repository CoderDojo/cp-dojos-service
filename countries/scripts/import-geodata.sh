#!/bin/bash

node scripts/countries-import.js

node scripts/geonames-import.js --country=no-country

node scripts/geonames-import.js --country=IE

node scripts/geonames-import.js --country=RO

