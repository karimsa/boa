#!/bin/bash -e

## scripts/lint.sh
## Various simple custom linting rules.
##
## Copyright (C) 2019-present Karim Alibhai. All rights reserved.

issueCount=0

function unexpected() {
  if cat "$1" | grep "$2" &>/dev/null; then
    cat -n "$1" | \
      grep "$2" | \
      sed -E "s/^[[:space:]]+([0-9]+).*/  \1: $3/" \
      2>&1 >> "$4"
  else
    return 1
  fi
}

# check each file
for fpath in `find src -type f -name '*.js' -or -name '*.jsx' -or -name '*.ts' -or -name '*.tsx'`; do
  echo -en "checking: $fpath\033[K\r"

  hasIssues="false"
  issues="$(mktemp)"

  # 'TODO' comments should not exist
  if cat "$fpath" | grep 'TODO: ' &>/dev/null; then
    cat -n "$fpath" | \
      grep 'TODO: ' | \
      sed -E 's/^[[:space:]]+([0-9]+)[[:space:]]+\/\/ TODO: (.*)$/  \1: Unexpected TODO comment - should contain a reference to JIRA/' \
      2>&1 >> "$issues"

    hasIssues="true"
    issueCount="$[$issueCount+$(cat "$fpath" | grep 'TODO: ' | wc -l)]"
  fi

  # Copyright comments should exist
  if ! cat "$fpath" | grep '@copyright' &>/dev/null; then
    echo "  0: No copyright comments" 2>&1 >> "$issues"
    hasIssues="true"
    issueCount="$[$issueCount+1]"
  fi
  
  # No 'test.only' is allowed
  if unexpected "$fpath" 'test.only' 'Unexpected test.only' "$issues"; then
    hasIssues="true"
    issueCount="$[$issueCount+$(cat "$fpath" | grep 'test.only' | wc -l)]"
  fi

  # Should use `._id` instead of `.id`
  if unexpected "$fpath" '\\.id' 'Unexpected .id, should use ._id' "$issues"; then
    hasIssues="true"
    issueCount="$[$issueCount+$(cat "$fpath" | grep '.id' | wc -l)]"
  fi

  # Print it!
  if test "$hasIssues" = "true"; then
    echo "$fpath:"
    cat "$issues"
    echo ""
  fi
done

if test "$issueCount" -gt "0"; then
  echo "${issueCount} issues found."
  exit 1
fi
