#!/bin/bash

# Load environment variables from .env file
set -o allexport
source .env
set +o allexport

# Extract PROJECT_REF from SUPABASE_URL
PROJECT_REF=$(echo $SUPABASE_URL | sed -e 's/https:\/\/\([^.]*\).*/\1/')

# Check if PROJECT_REF is empty
if [ -z "$PROJECT_REF" ]; then
  echo "PROJECT_REF could not be extracted from SUPABASE_URL"
  exit 1
fi

# Generate types using npx supabase gen types
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > types/supabase.d.ts

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo "Supabase types generated successfully in types/supabase.ts"
else
  echo "Failed to generate Supabase types"
  exit 1
fi
