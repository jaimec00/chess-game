#!/usr/bin/env bash
#
# Upload a screenshot PNG to the pr-screenshots orphan branch and embed it in a PR body.
#
# Usage: bash scripts/upload-screenshot.sh <image-path> <pr-number> [--label <name>]
#
# The optional --label flag adds a suffix to the filename (e.g. pr-30-landing.png)
# and uses it as the image caption. This allows multiple screenshots per PR.
#

set -euo pipefail

IMAGE_PATH=""
PR_NUMBER=""
LABEL=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      LABEL="${2:?--label requires a value}"
      shift 2
      ;;
    *)
      if [ -z "$IMAGE_PATH" ]; then
        IMAGE_PATH="$1"
      elif [ -z "$PR_NUMBER" ]; then
        PR_NUMBER="$1"
      else
        echo "Error: unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$IMAGE_PATH" ] || [ -z "$PR_NUMBER" ]; then
  echo "Usage: upload-screenshot.sh <image-path> <pr-number> [--label <name>]" >&2
  exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Error: file not found: $IMAGE_PATH" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
BRANCH="pr-screenshots"

if [ -n "$LABEL" ]; then
  FILENAME="pr-${PR_NUMBER}-${LABEL}.png"
  ALT_TEXT="$LABEL"
else
  FILENAME="pr-${PR_NUMBER}.png"
  ALT_TEXT="screenshot"
fi

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

# Check if file already exists (need its SHA to overwrite).
# gh api outputs the full 404 JSON to stdout on missing files, so we must
# check the exit code explicitly — not just capture output with || true.
EXISTING_SHA=""
if gh api "${API_PATH}?ref=${BRANCH}" --jq '.sha' > /tmp/existing-sha.txt 2>/dev/null; then
  EXISTING_SHA=$(cat /tmp/existing-sha.txt)
fi
rm -f /tmp/existing-sha.txt

# Build JSON payload using jq --rawfile to avoid "Argument list too long" from
# passing the base64 content as a shell variable or jq --arg.
UPLOAD_JSON=$(mktemp)
trap 'rm -f "$UPLOAD_JSON"' EXIT

base64 -w0 "$IMAGE_PATH" > /tmp/b64content.txt

if [ -n "$EXISTING_SHA" ]; then
  jq -n --rawfile content /tmp/b64content.txt \
    --arg msg "add screenshot for PR #${PR_NUMBER}" \
    --arg branch "$BRANCH" \
    --arg sha "$EXISTING_SHA" \
    '{"message":$msg,"branch":$branch,"content":$content,"sha":$sha}' > "$UPLOAD_JSON"
else
  jq -n --rawfile content /tmp/b64content.txt \
    --arg msg "add screenshot for PR #${PR_NUMBER}" \
    --arg branch "$BRANCH" \
    '{"message":$msg,"branch":$branch,"content":$content}' > "$UPLOAD_JSON"
fi
rm -f /tmp/b64content.txt

gh api "$API_PATH" -X PUT --input "$UPLOAD_JSON" --silent
echo "Uploaded ${FILENAME} to ${BRANCH}."

# --- Build the raw URL ---

IMAGE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILENAME}"
echo "Image URL: ${IMAGE_URL}"

# --- Update the PR body with the screenshot ---

IMAGE_LINE="![${ALT_TEXT}](${IMAGE_URL})"
CURRENT_BODY=$(gh api "repos/${REPO}/pulls/${PR_NUMBER}" --jq '.body')

if echo "$CURRENT_BODY" | grep -qF "$IMAGE_URL"; then
  echo "PR body already contains this image URL — skipping."
elif echo "$CURRENT_BODY" | grep -q '## Screenshot'; then
  # Append the new image after the existing ## Screenshot heading and any existing images
  # Find the screenshot section and append the new image after the last image line in it
  NEW_BODY=$(echo "$CURRENT_BODY" | awk -v img="$IMAGE_LINE" '
    /^## Screenshot/ { in_section=1; print; next }
    in_section && /^!\[/ { last_img=NR; print; next }
    in_section && !/^!\[/ && !/^[[:space:]]*$/ { if (!appended) { print img; print ""; appended=1 } in_section=0; print; next }
    in_section && /^[[:space:]]*$/ { hold=hold $0 "\n"; next }
    {
      if (hold != "") {
        if (!appended && !in_section) { printf "%s", hold; print img; print ""; appended=1 }
        else { printf "%s", hold }
        hold=""
      }
      print
    }
    END { if (hold != "" || (in_section && !appended)) { print img; print ""; printf "%s", hold } }
  ')

  BODY_JSON=$(mktemp)
  printf '%s' "$NEW_BODY" | jq -Rs '{"body": .}' > "$BODY_JSON"
  gh api "repos/${REPO}/pulls/${PR_NUMBER}" -X PATCH --input "$BODY_JSON" --silent
  rm -f "$BODY_JSON"
  echo "PR #${PR_NUMBER} body updated — appended screenshot to existing section."
else
  NEW_BODY="## Screenshot

${IMAGE_LINE}

${CURRENT_BODY}"

  BODY_JSON=$(mktemp)
  printf '%s' "$NEW_BODY" | jq -Rs '{"body": .}' > "$BODY_JSON"
  gh api "repos/${REPO}/pulls/${PR_NUMBER}" -X PATCH --input "$BODY_JSON" --silent
  rm -f "$BODY_JSON"
  echo "PR #${PR_NUMBER} body updated with screenshot."
fi

# jq -Rs can escape ! to \! which breaks GitHub image markdown rendering.
# Verify and fix if needed.
UPDATED_BODY=$(gh api "repos/${REPO}/pulls/${PR_NUMBER}" --jq '.body')
if echo "$UPDATED_BODY" | grep -q '\\!'; then
  echo "Fixing escaped \\! in PR body..."
  FIX_JSON=$(mktemp)
  printf '%s' "$UPDATED_BODY" | sed 's/\\!/!/g' | jq -Rs '{"body": .}' > "$FIX_JSON"
  gh api "repos/${REPO}/pulls/${PR_NUMBER}" -X PATCH --input "$FIX_JSON" --silent
  rm -f "$FIX_JSON"
fi

echo "Done."
