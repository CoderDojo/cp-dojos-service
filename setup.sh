#! /bin/bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd );
FILE="$DIR/config/$1".env

USAGE="Usage: ./setup.sh <config>"

if [ ! -r $FILE ] ; then
  echo "config file not found"
  echo $USAGE
  exit 1
fi

source $FILE

if [ $DOCKER_HOST ] ; then
    # extract the protocol
    proto="$(echo $DOCKER_HOST | grep :// | sed -e's,^\(.*://\).*,\1,g')"

    # remove the protocol
    url="$(echo ${DOCKER_HOST/$proto/})"

    #remove port from url
    LOCAL_HOST=${url%:*}
  else
    if [ $TARGETIP ] ; then
      LOCAL_HOST=$TARGETIP
    else
      LOCAL_HOST="127.0.0.1"
    fi
  fi

if [ $POSTGRES_HOST ] ; then
	PG_HOST=$POSTGRES_HOST
else
  PG_HOST=$LOCAL_HOST
fi

if [ ! $POSTGRES_PORT ] ; then
  PG_PORT=5432
else
  PG_PORT=$POSTGRES_PORT
fi

echo "Deleting '$ES_INDEX' index" ;
curl -XDELETE 'http://'$LOCAL_HOST':9200/'$ES_INDEX'?pretty'

$DIR/start.sh $1 scripts/migrate-psql-db.js
if [[ $? != 0 ]]; then exit 1; fi

psql --single-transaction -h $PG_HOST -U $POSTGRES_USERNAME -d $POSTGRES_NAME -f $DIR/scripts/database/pg/populate-dojos.sql --port $PG_PORT

$DIR/start.sh $1 "scripts/add-geonames-data.js"

$DIR/start.sh $1 "scripts/generate-slugs.js"

$DIR/start.sh $1 "scripts/es-index-dojos-data.js"

echo "-------------------------------------------------------"
echo "----------Finished initializating dojos DB & ES--------"
echo "-------------------------------------------------------"