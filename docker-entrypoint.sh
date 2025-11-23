#!/bin/bash
set -e

# Mount Cloud Storage bucket if GCS_BUCKET_NAME is set
if [ -n "$GCS_BUCKET_NAME" ]; then
  echo "Mounting Cloud Storage bucket: $GCS_BUCKET_NAME"
  gcsfuse --implicit-dirs $GCS_BUCKET_NAME /data
fi

# Start Node.js server
exec node server/index.js
