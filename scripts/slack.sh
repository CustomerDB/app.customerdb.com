#!/bin/bash

TEXT=$1

DATA=$(cat <<-END
{
  "text": "${TEXT}\n> :rocket: <https://console.cloud.google.com/cloud-build/builds/${BUILD}?project=${PROJECT}|Revision ${REV}>"
}
END
)

echo ${DATA}

curl -X POST \
  -H 'Content-type: application/json' \
  --data "${DATA}" \
  ${SLACK_WEB_HOOK}
