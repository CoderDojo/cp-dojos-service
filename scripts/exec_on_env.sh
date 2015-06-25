#!/bin/bash

if [ -z "$PROJECT_DIR" ]; then
    echo "PROJECT_DIR should be defined before import $(basename "${BASH_SOURCE[0]}"), it will be used to find the env file" >&2
    echo "PROJECT_DIR should point to the project directory" >&2
    echo 'i.e. PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";' >&2
    exit 1
fi

if [ -z "$USAGE" ]; then
    echo "USAGE should be define before import $(basename "${BASH_SOURCE[0]}")" >&2
    exit 1
fi

ENVIRONMENT=$1 && shift
FILE="$PROJECT_DIR/config/$ENVIRONMENT.env"

export ENVIRONMENT=$ENVIRONMENT

if [ ! -f "$FILE" ] ; then
    echo "ERROR: config file $FILE not found" >&2
    echo $USAGE >&2
    exit 1
fi

source "$FILE"

function get_abs_filename() {
    # $1 : relative filename
    if [ -d "$(dirname "$1")" ]; then
        echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
    fi
}

function check_script {
    START="$1"

    if [ ! -f "$START" ] ; then
      echo "ERROR: start script $START not found" >&2
      echo $USAGE >&2
      exit 1
    fi
}

function run_js {
    JSFILE=$(get_abs_filename "$1") && shift
    check_script "$JSFILE"
    node "$JSFILE" $@
}

function exec_js {
    JSFILE=$(get_abs_filename "$1") && shift
    check_script "$JSFILE"
    exec node "$JSFILE" $@
}