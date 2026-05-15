#!/usr/bin/env bash
# Fetch GitHub trending repos for the current week
# Usage: ./fetch-trending.sh [output_dir]
# Outputs two JSON files: new-stars.json (created this week) and rising-stars.json (most star growth)

set -euo pipefail

OUTPUT_DIR="${1:-.}"

# Calculate date range (Monday to Sunday of current week)
DOW=$(date +%u)  # 1=Monday, 7=Sunday
MONDAY=$(date -v-$((DOW - 1))d +%Y-%m-%d 2>/dev/null || date -d "last monday" +%Y-%m-%d)
TODAY=$(date +%Y-%m-%d)
YEAR=$(date +%Y)
WEEK=$(date +%V)

echo "Week: ${YEAR}-W${WEEK} (${MONDAY} ~ ${TODAY})"

# --- Section 1: New repos created this week, sorted by stars ---
echo "Fetching new repos created since ${MONDAY}..."
gh api search/repositories \
  --method GET \
  -f q="created:>=${MONDAY} stars:>50" \
  -f sort=stars \
  -f order=desc \
  -f per_page=10 \
  --jq '[.items[] | {
    name: .full_name,
    url: .html_url,
    description: .description,
    language: .language,
    stars: .stargazers_count,
    forks: .forks_count,
    topics: .topics,
    created_at: .created_at,
    homepage: .homepage
  }]' > "${OUTPUT_DIR}/new-stars.json"

NEW_COUNT=$(jq length "${OUTPUT_DIR}/new-stars.json")
echo "Found ${NEW_COUNT} new repos"

# --- Section 2: Repos with most star growth this week ---
# Strategy: search repos pushed this week with high stars, then sort by recent activity
echo "Fetching rising repos..."
gh api search/repositories \
  --method GET \
  -f q="pushed:>=${MONDAY} stars:>1000" \
  -f sort=updated \
  -f order=desc \
  -f per_page=30 \
  --jq '[.items[] | {
    name: .full_name,
    url: .html_url,
    description: .description,
    language: .language,
    stars: .stargazers_count,
    forks: .forks_count,
    topics: .topics,
    created_at: .created_at,
    homepage: .homepage
  }]' > "${OUTPUT_DIR}/rising-raw.json"

# Sort by stars descending and take top 10
jq '[sort_by(-.stars) | limit(10; .[])]' "${OUTPUT_DIR}/rising-raw.json" > "${OUTPUT_DIR}/rising-stars.json"
rm -f "${OUTPUT_DIR}/rising-raw.json"

RISING_COUNT=$(jq length "${OUTPUT_DIR}/rising-stars.json")
echo "Found ${RISING_COUNT} rising repos"

# Output metadata
cat > "${OUTPUT_DIR}/meta.json" <<METAEOF
{
  "year": ${YEAR},
  "week": ${WEEK},
  "monday": "${MONDAY}",
  "today": "${TODAY}",
  "new_count": ${NEW_COUNT},
  "rising_count": ${RISING_COUNT}
}
METAEOF

echo "Done. Files written to ${OUTPUT_DIR}/"
