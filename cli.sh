#!/bin/bash -e
set -e
set -o pipefail

verbose="false"
action=""

while test "$#" -gt "0"; do
	case "$1" in
		-v|--verbose)
			shift
			verbose="true"
			;;

		-*)
			echo "Unknown flag: $1"
			exit 1
			;;

		*)
			if ! test -z "$action"; then
				echo "Cannot run with two actions"
				exit 1
			fi

			action="$1"
			shift
			;;
	esac
done

dir="$(cd $(dirname $0) && pwd)"
export PATH="$PATH:$dir/node_modules/.bin"

case "$action" in
	lint)
		"$dir/scripts/lint.sh"
		eslint src/**/*.js
		;;

	*)
		echo "Unknown action: $action"
		exit 1
		;;
esac
