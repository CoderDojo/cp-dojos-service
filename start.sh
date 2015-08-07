#! /bin/bash
PROJECT_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
SCRIPT=$( basename "${BASH_SOURCE[0]}" )
USAGE="Usage: ./$SCRIPT <config> <startscript> [startscript_opts]..."

source "$PROJECT_DIR/scripts/exec_on_env.sh"

exec_js $@
