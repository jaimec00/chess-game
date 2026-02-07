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
  EMPTY_TREE=$(gh api "repos/${REPO}/git/trees" \
    -f 'tree[0][path]=.gitkeep' \
    -f 'tree[0][mode]=100644' \
    -f 'tree[0][type]=blob' \
    -f 'tree[0][content]=' \
    --jq '.sha')

  # Create a parentless commit
  COMMIT_SHA=$(gh api "repos/${REPO}/git/commits" \
    -f message="initialize pr-screenshots branch" \
    -f "tree=${EMPTY_TREE}" \
    --jq '.sha')

  # Create the ref
  gh api "repos/${REPO}/git/refs" \
    -f "ref=refs/heads/${BRANCH}" \
    -f "sha=${COMMIT_SHA}" --silent
  echo "Branch '${BRANCH}' created."
fi

# --- Upload the image via Contents API ---

CONTENT=$(base64 -w0 "$IMAGE_PATH")
API_PATH="repos/${REPO}/contents/${FILENAME}"

# Check if file already exists (need its SHA to overwrite)
EXISTING_SHA=$(gh api "${API_PATH}?ref=${BRANCH}" --jq '.sha' 2>/dev/null || echo "")

UPLOAD_ARGS=(
  -f "message=add screenshot for PR #${PR_NUMBER}"
  -f "content=${CONTENT}"
  -f "branch=${BRANCH}"
)

if [ -n "$EXISTING_SHA" ]; then
  UPLOAD_ARGS+=(-f "sha=${EXISTING_SHA}")
fi

gh api "$API_PATH" -X PUT "${UPLOAD_ARGS[@]}" --silent
echo "Uploaded ${FILENAME} to ${BRANCH}."

# --- Build the raw URL ---

IMAGE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILENAME}"
echo "Image URL: ${IMAGE_URL}"

# --- Prepend screenshot section to PR body ---

CURRENT_BODY=$(gh pr view "$PR_NUMBER" --json body -q '.body')

if echo "$CURRENT_BODY" | grep -q '## Screenshot'; then
  echo "PR body already contains a screenshot section — skipping."
else
  NEW_BODY="## Screenshot

![PR Screenshot](${IMAGE_URL})

${CURRENT_BODY}"

  gh pr edit "$PR_NUMBER" --body "$NEW_BODY"
  echo "PR #${PR_NUMBER} body updated with screenshot."
fi

echo "Done."
