#!/usr/bin/env bash
#
# Upload a screenshot PNG to the pr-screenshots orphan branch and embed it in a PR body.
#
# Usage: bash scripts/upload-screenshot.sh <image-path> <pr-number>
#

set -euo pipefail

IMAGE_PATH="${1:?Usage: upload-screenshot.sh <image-path> <pr-number>}"
PR_NUMBER="${2:?Usage: upload-screenshot.sh <image-path> <pr-number>}"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Error: file not found: $IMAGE_PATH" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
BRANCH="pr-screenshots"
FILENAME="pr-${PR_NUMBER}.png"

echo "Repo: $REPO"
echo "Uploading $IMAGE_PATH as $FILENAME to branch $BRANCH..."

# --- Ensure the orphan branch exists ---

if ! gh api "repos/${REPO}/git/ref/heads/${BRANCH}" --silent 2>/dev/null; then
  echo "Creating orphan branch '${BRANCH}'..."

  # Create an empty tree
  EMPTY_TREE=$(echo '{"tree":[{"path":".gitkeep","mode":"100644","type":"blob","content":""}]}' \
    | gh api "repos/${REPO}/git/trees" --input - --jq '.sha')

  # Create a parentless commit (no parents = orphan)
  COMMIT_SHA=$(echo "{\"message\":\"initialize pr-screenshots branch\",\"tree\":\"${EMPTY_TREE}\",\"parents\":[]}" \
    | gh api "repos/${REPO}/git/commits" --input - --jq '.sha')

  # Create the ref
  gh api "repos/${REPO}/git/refs" \
    -f "ref=refs/heads/${BRANCH}" \
    -f "sha=${COMMIT_SHA}" --silent
  echo "Branch '${BRANCH}' created."
fi

# --- Upload the image via Contents API ---

API_PATH="repos/${REPO}/contents/${FILENAME}"

# Check if file already exists (need its SHA to overwrite)
EXISTING_SHA=$(gh api "${API_PATH}?ref=${BRANCH}" --jq '.sha' 2>/dev/null || true)

# Build JSON payload with base64 content, writing to a temp file to avoid arg-list limits
UPLOAD_JSON=$(mktemp)
trap 'rm -f "$UPLOAD_JSON"' EXIT

{
  printf '{"message":"add screenshot for PR #%s","branch":"%s","content":"' "$PR_NUMBER" "$BRANCH"
  base64 -w0 "$IMAGE_PATH"
  printf '"'
  if [ -n "$EXISTING_SHA" ]; then
    printf ',"sha":"%s"' "$EXISTING_SHA"
  fi
  printf '}'
} > "$UPLOAD_JSON"

gh api "$API_PATH" -X PUT --input "$UPLOAD_JSON" --silent
echo "Uploaded ${FILENAME} to ${BRANCH}."

# --- Build the raw URL ---

IMAGE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILENAME}"
echo "Image URL: ${IMAGE_URL}"

# --- Prepend screenshot section to PR body ---

CURRENT_BODY=$(gh api "repos/${REPO}/pulls/${PR_NUMBER}" --jq '.body')

if echo "$CURRENT_BODY" | grep -q '## Screenshot'; then
  echo "PR body already contains a screenshot section — skipping."
else
  NEW_BODY="## Screenshot

![PR Screenshot](${IMAGE_URL})

${CURRENT_BODY}"

  # Use REST API to update the PR body (avoids gh pr edit GraphQL issues)
  BODY_JSON=$(mktemp)
  # Use jq to properly escape the body string
  printf '%s' "$NEW_BODY" | jq -Rs '{"body": .}' > "$BODY_JSON"
  gh api "repos/${REPO}/pulls/${PR_NUMBER}" -X PATCH --input "$BODY_JSON" --silent
  rm -f "$BODY_JSON"
  echo "PR #${PR_NUMBER} body updated with screenshot."
fi

echo "Done."
