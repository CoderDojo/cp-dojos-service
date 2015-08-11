#!/bin/bash
isExistApp=`pgrep cp-dojos-service`
if [[ -n $isExistApp ]]; then
  service cp-dojos-service stop
fi
