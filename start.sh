#! /bin/bash
PROJECT_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
SCRIPT=$( basename "${BASH_SOURCE[0]}" )
USAGE="Usage: ./$SCRIPT <config> <startscript> [startscript_opts]..."

source "$PROJECT_DIR/scripts/exec_on_env.sh"

if [ -z $DONOTMIGRATE ] ; then
    run_js "$PROJECT_DIR/scripts/migrate-psql-db.js" || exit 1;
fi 

exec_js $@
