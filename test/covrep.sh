#!/bin/bash
WORKDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";

FILE="$WORKDIR/../coverage/lcov-report/index.html"
if [[ "$OSTYPE" == *"linux"* ]]; then sensible-browser $FILE
  else open $FILE
fi