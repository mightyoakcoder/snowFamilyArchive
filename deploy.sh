#!/bin/bash

# Deployment script for Snow Family Archive
# Usage: ./deploy.sh [PROJECT_ID] [BUCKET_NAME] [REGION]
#
# On first run: creates secrets in Secret Manager (prompts for values),
# sets up Artifact Registry, and deploys via Cloud Build.
# On subsequent runs: skips existing secrets and rebuilds/redeploys.

set -e

# Configuration
PROJECT_ID=${1:-""}
BUCKET_NAME=${2:-""}
REGION=${3:-"us-central1"}
SERVICE_NAME="file-upload-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Snow Family Archive — Cloud Run Deployment ===${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get or set project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: No project ID specified and no default project set${NC}"
        echo "Usage: ./deploy.sh [PROJECT_ID] [BUCKET_NAME] [REGION]"
        exit 1
    fi
fi

echo -e "${YELLOW}Project:${NC} $PROJECT_ID"
echo -e "${YELLOW}Region:${NC}  $REGION"
gcloud config set project "$PROJECT_ID"

# ── Enable APIs ──────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# ── Cloud Storage bucket ──────────────────────────────────────────────────────
echo -e "\n${YELLOW}Checking Cloud Storage bucket...${NC}"
if [ -n "$BUCKET_NAME" ]; then
    if ! gcloud storage buckets describe "gs://$BUCKET_NAME" &>/dev/null; then
        echo "Creating bucket: $BUCKET_NAME"
        gcloud storage buckets create "gs://$BUCKET_NAME" --location="$REGION"
    else
        echo "Bucket already exists: $BUCKET_NAME"
    fi
else
    BUCKET_NAME="${PROJECT_ID}-uploads-$(date +%s)"
    echo "Creating new bucket: $BUCKET_NAME"
    gcloud storage buckets create "gs://$BUCKET_NAME" --location="$REGION"
fi
echo -e "${GREEN}Bucket:${NC} $BUCKET_NAME"

# ── Artifact Registry repo ───────────────────────────────────────────────────
echo -e "\n${YELLOW}Checking Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe "$SERVICE_NAME" \
    --location="$REGION" &>/dev/null; then
    echo "Creating Artifact Registry repository: $SERVICE_NAME"
    gcloud artifacts repositories create "$SERVICE_NAME" \
        --repository-format=docker \
        --location="$REGION"
else
    echo "Repository already exists: $SERVICE_NAME"
fi

# ── IAM — Cloud Build and Cloud Run service accounts ─────────────────────────
echo -e "\n${YELLOW}Configuring IAM permissions...${NC}"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Cloud Build needs to read secrets and push images
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None --quiet

# Cloud Run (default Compute SA) needs to read runtime secrets
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None --quiet

# ── Secret Manager ───────────────────────────────────────────────────────────
echo -e "\n${YELLOW}Configuring secrets in Secret Manager...${NC}"

create_or_skip_secret() {
    local SECRET_NAME=$1
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo "  Secret already exists: $SECRET_NAME (skipping)"
    else
        echo -n "  Enter value for $SECRET_NAME: "
        read -rs SECRET_VALUE
        echo
        printf '%s' "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --data-file=- \
            --project="$PROJECT_ID"
        echo "  Created: $SECRET_NAME"
    fi
}

create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        printf '%s' "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
            --data-file=- \
            --project="$PROJECT_ID"
        echo "  Updated: $SECRET_NAME"
    else
        printf '%s' "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --data-file=- \
            --project="$PROJECT_ID"
        echo "  Created: $SECRET_NAME"
    fi
}

create_or_skip_secret "VITE_FIREBASE_API_KEY"
create_or_skip_secret "VITE_FIREBASE_AUTH_DOMAIN"
create_or_skip_secret "VITE_FIREBASE_PROJECT_ID"
create_or_skip_secret "VITE_FIREBASE_APP_ID"

# GCS_BUCKET_NAME is always synced to match the bucket we created/verified above
create_or_update_secret "GCS_BUCKET_NAME" "$BUCKET_NAME"

# ── Build and deploy via Cloud Build ─────────────────────────────────────────
echo -e "\n${YELLOW}Building and deploying via Cloud Build...${NC}"
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_SERVICE_NAME=${SERVICE_NAME}" \
  --project="$PROJECT_ID"

# ── Bucket permissions for Cloud Run SA ──────────────────────────────────────
echo -e "\n${YELLOW}Granting bucket access to Cloud Run service account...${NC}"
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET_NAME" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role=roles/storage.objectAdmin

# ── Done ─────────────────────────────────────────────────────────────────────
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format='value(status.url)')

echo -e "\n${GREEN}=== Deployment Complete! ===${NC}"
echo -e "${GREEN}Service URL:${NC} $SERVICE_URL"
echo -e "${GREEN}Bucket:${NC}      $BUCKET_NAME"
echo -e "${GREEN}Region:${NC}      $REGION"
echo -e "\n${YELLOW}Note: Make sure Firestore is initialized in Native mode.${NC}"
echo -e "https://console.cloud.google.com/firestore"
