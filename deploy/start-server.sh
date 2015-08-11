#!/bin/bash
isExistApp=`ps -eaf |grep cp-dojos-service |grep -v grep| awk '{ print $2; }'`
if [[ -n $isExistApp ]]; then
    service cp-dojos-service stop
fi

service cp-dojos-service start
