#!/bin/bash
set -e

# Deploy Discord Bot to AWS Lightsail instance via SSH
# Pulls pre-built image from GHCR instead of building on the instance.
# Usage: ./scripts/deploy.sh <host>

HOST=$1

if [ -z "$HOST" ]; then
  echo "Usage: $0 <host>"
  exit 1
fi

# Validate required environment variables
MISSING_VARS=()
for var in BOT_TOKEN APPLICATION_ID SUPABASE_URL SUPABASE_SERVICE_KEY GHCR_TOKEN IMAGE_TAG; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "Error: Required environment variables are not set:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

echo "==> Deploying Bot to $HOST (image: $IMAGE_TAG)"

SSH_USER="ubuntu"
SSH_KEY="${SSH_KEY_PATH:-$HOME/.ssh/lightsail_key}"
APP_DIR="/opt/discalendar-next"

SSH_OPTS="-o ServerAliveInterval=60"

ssh -i "$SSH_KEY" $SSH_OPTS "${SSH_USER}@${HOST}" <<REMOTE_SCRIPT
set -e

echo "==> Logging in to GHCR..."
echo "${GHCR_TOKEN}" | docker login ghcr.io -u github-actions --password-stdin

echo "==> Pulling image: ${IMAGE_TAG}..."
docker pull "${IMAGE_TAG}"

echo "==> Preparing application directory..."
sudo mkdir -p $APP_DIR
sudo chown $SSH_USER:$SSH_USER $APP_DIR
cd $APP_DIR

echo "==> Configuring AWS credentials for CloudWatch Logs..."
mkdir -p ~/.aws
cat > ~/.aws/credentials <<'AWSCRED'
[default]
aws_access_key_id = ${CLOUDWATCH_ACCESS_KEY_ID}
aws_secret_access_key = ${CLOUDWATCH_SECRET_ACCESS_KEY}
AWSCRED
chmod 600 ~/.aws/credentials

cat > ~/.aws/config <<'AWSCONF'
[default]
region = ${AWS_REGION:-ap-northeast-1}
AWSCONF
chmod 644 ~/.aws/config

sudo mkdir -p /root/.aws
echo "[default]" | sudo tee /root/.aws/credentials > /dev/null
echo "aws_access_key_id = ${CLOUDWATCH_ACCESS_KEY_ID}" | sudo tee -a /root/.aws/credentials > /dev/null
echo "aws_secret_access_key = ${CLOUDWATCH_SECRET_ACCESS_KEY}" | sudo tee -a /root/.aws/credentials > /dev/null
sudo chmod 600 /root/.aws/credentials

echo "[default]" | sudo tee /root/.aws/config > /dev/null
echo "region = ${AWS_REGION:-ap-northeast-1}" | sudo tee -a /root/.aws/config > /dev/null
sudo chmod 644 /root/.aws/config
echo "    AWS credentials configured for ubuntu and root users"

echo "==> Creating .env file..."
cat > .env <<'ENVFILE'
BOT_TOKEN=${BOT_TOKEN}
APPLICATION_ID=${APPLICATION_ID}
INVITATION_URL=${INVITATION_URL:-}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
LOG_LEVEL=${LOG_LEVEL:-INFO}
SENTRY_DSN=${SENTRY_DSN:-}
AWS_REGION=${AWS_REGION:-ap-northeast-1}
AWS_CLOUDWATCH_LOG_GROUP=${CLOUDWATCH_LOG_GROUP:-}
ENVFILE
chmod 600 .env

echo "==> Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || true

echo "==> Starting new containers..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Waiting for container to start..."
for i in 1 2 3 4 5 6; do
  STATUS=\$(docker compose -f docker-compose.prod.yml ps --format json | head -1 | grep -o '"State":"[^"]*"' | grep -o '[^"]*$' || echo "unknown")
  if [ "\$STATUS" = "running" ]; then
    echo "    Container is running"
    break
  fi
  if [ "\$i" -eq 6 ]; then
    echo "Error: Container failed to start (status: \$STATUS)"
    docker compose -f docker-compose.prod.yml logs --tail=30
    exit 1
  fi
  echo "    Waiting... (attempt \$i/6, status: \$STATUS)"
  sleep 5
done

echo "==> Container status:"
docker compose -f docker-compose.prod.yml ps

echo "==> Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=20

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deployment completed successfully!"
REMOTE_SCRIPT

echo "==> Bot deployed to $HOST"
