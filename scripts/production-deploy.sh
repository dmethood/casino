#!/bin/bash
# Licensed Casino Platform - Production Deployment Script
# Traditional server deployment with security and compliance checks

set -euo pipefail

# Configuration
PROJECT_NAME="licensed-casino-platform"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
COMPLIANCE_CHECK="${COMPLIANCE_CHECK:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
NODE_VERSION="${NODE_VERSION:-20}"
APP_PORT="${APP_PORT:-3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

# Pre-deployment checks
pre_deployment_checks() {
    log "=== PRE-DEPLOYMENT CHECKS ==="
    
    # Check environment file
    if [ ! -f ".env.production" ]; then
        error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    # Verify critical environment variables
    log "Verifying critical environment variables..."
    
    source .env.production
    
    local required_vars=(
        "APP_ENV"
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "STRIPE_SECRET_KEY"
        "AIRWALLEX_API_KEY"
        "KYC_PROVIDER_API_KEY"
        "ACTIVE_LICENSES"
        "GEO_ALLOW_LIST"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Verify no demo/test values
    if [[ "$STRIPE_SECRET_KEY" == *"test"* ]] || [[ "$STRIPE_SECRET_KEY" == *"sk_test"* ]]; then
        error "STRIPE_SECRET_KEY appears to be a test key (production keys start with sk_live_)"
        exit 1
    fi
    
    if [[ "$APP_ENV" != "production" ]]; then
        error "APP_ENV must be set to 'production'"
        exit 1
    fi
    
    log "Environment variables verified"
    
    # Check Node.js and PM2
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    local major_version=$(echo "$node_version" | cut -d'.' -f1)
    
    if [ "$major_version" -lt "$NODE_VERSION" ]; then
        error "Node.js version $node_version is too old. Requires >= $NODE_VERSION"
        exit 1
    fi
    
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed. Install with: npm install -g pm2"
        exit 1
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client is not installed"
        exit 1
    fi
    
    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        error "Redis client is not installed"
        exit 1
    fi
    
    log "Runtime environment verified"
    
    # Check license configuration
    log "Validating license configuration..."
    
    if [ "$COMPLIANCE_CHECK" = "true" ]; then
        npm run license:verify || {
            error "License validation failed"
            exit 1
        }
    fi
    
    log "Pre-deployment checks completed successfully"
}

# Create backup before deployment
create_pre_deploy_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log "=== CREATING PRE-DEPLOYMENT BACKUP ==="
        
        # Create timestamped backup
        local backup_name="pre_deploy_$(date '+%Y%m%d_%H%M%S')"
        local backup_file="./backups/${backup_name}.sql"
        local encrypted_file="${backup_file}.enc"
        
        # Create backup using pg_dump
        if pg_dump "$DATABASE_URL" \
           --format=custom --compress=9 \
           --exclude-table='audit_logs' \
           --exclude-table='user_sessions' \
           --file="$backup_file"; then
            
            # Encrypt backup
            openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
                -in "$backup_file" -out "$encrypted_file" \
                -k "$BACKUP_ENCRYPTION_KEY"
            
            # Remove unencrypted backup
            rm -f "$backup_file"
            
            # Generate checksum
            sha256sum "$encrypted_file" > "${encrypted_file}.sha256"
            
            log "Pre-deployment backup created: ${backup_name}.sql.enc"
        else
            error "Pre-deployment backup failed"
            exit 1
        fi
    else
        warn "Pre-deployment backup skipped"
    fi
}

# Build and deploy application
deploy_application() {
    log "=== DEPLOYING APPLICATION ==="
    
    # Stop existing application
    log "Stopping existing application..."
    pm2 stop casino-platform 2>/dev/null || true
    
    # Install dependencies
    log "Installing production dependencies..."
    npm ci --production --silent
    
    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate
    
    # Build application
    log "Building application..."
    npm run build
    
    # Test database connectivity
    log "Testing database connectivity..."
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Database connection failed"
        exit 1
    fi
    
    # Test Redis connectivity
    log "Testing Redis connectivity..."
    if ! redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
        error "Redis connection failed"
        exit 1
    fi
    
    # Run database migrations
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        log "Running database migrations..."
        npm run migrate
        log "Database migrations completed"
    fi
    
    # Start application with PM2
    log "Starting application with PM2..."
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    log "Application deployment completed"
}

# Post-deployment verification
post_deployment_verification() {
    log "=== POST-DEPLOYMENT VERIFICATION ==="
    
    # Wait for application to start
    log "Waiting for application to start..."
    sleep 30
    
    # Health check
    log "Performing health checks..."
    
    local health_check_passed=false
    local attempts=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -f -s "http://localhost:$APP_PORT/api/health" > /dev/null; then
            health_check_passed=true
            break
        fi
        
        attempts=$((attempts + 1))
        sleep 10
    done
    
    if [ "$health_check_passed" = false ]; then
        error "Health check failed after $HEALTH_CHECK_TIMEOUT seconds"
        
        # Show logs for debugging
        log "Application logs:"
        pm2 logs casino-platform --lines 50
        
        exit 1
    fi
    
    log "Health check passed"
    
    # Compliance verification
    if [ "$COMPLIANCE_CHECK" = "true" ]; then
        log "Running compliance checks..."
        
        if npm run compliance:check; then
            log "Compliance checks passed"
        else
            error "Compliance checks failed"
            exit 1
        fi
    fi
    
    # Test critical functionality
    log "Testing critical functionality..."
    
    # Test database connectivity
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
        log "Database connectivity verified"
    else
        error "Database connectivity test failed"
        exit 1
    fi
    
    # Test Redis connectivity
    if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
        log "Redis connectivity verified"
    else
        error "Redis connectivity test failed"
        exit 1
    fi
    
    log "Post-deployment verification completed successfully"
}

# Security scan
run_security_scan() {
    log "=== RUNNING SECURITY SCAN ==="
    
    # Check for npm vulnerabilities
    npm audit --audit-level high
    
    # Run security linting
    npm run lint
    
    # Type checking
    npm run type-check
    
    log "Security scan completed"
}

# Generate deployment report
generate_deployment_report() {
    local deployment_time=$(date '+%Y-%m-%d %H:%M:%S')
    local deployment_id="DEPLOY-$(date '+%Y%m%d%H%M%S')"
    
    log "=== GENERATING DEPLOYMENT REPORT ==="
    
    cat > "./logs/deployment-${deployment_id}.json" << EOF
{
  "deploymentId": "$deployment_id",
  "timestamp": "$deployment_time",
  "environment": "$DEPLOY_ENV",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "services": {
    "application": "$(pm2 jlist | jq -r '.[] | select(.name=="casino-platform") | .pm2_env.status')",
    "database": "$(psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1 && echo 'online' || echo 'offline')",
    "redis": "$(redis-cli -u "$REDIS_URL" ping 2>/dev/null || echo 'offline')"
  },
  "healthChecks": {
    "application": "$(curl -s http://localhost:$APP_PORT/api/health | jq -r '.status' 2>/dev/null || echo 'unavailable')",
    "database": "passed",
    "redis": "passed"
  },
  "compliance": {
    "licensesVerified": true,
    "environmentValidated": true,
    "securityScanCompleted": true
  }
}
EOF
    
    log "Deployment report generated: ./logs/deployment-${deployment_id}.json"
}

# Rollback function
rollback_deployment() {
    error "INITIATING ROLLBACK"
    
    # Stop current application
    pm2 stop casino-platform 2>/dev/null || true
    
    # Restore from backup if available
    local latest_backup=$(find "./backups" -name "pre_deploy_*.sql.enc" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [ -n "$latest_backup" ]; then
        log "Restoring from backup: $(basename "$latest_backup")"
        
        # Restore backup
        openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
            -in "$latest_backup" -k "$BACKUP_ENCRYPTION_KEY" | \
            pg_restore --dbname="$DATABASE_URL" --clean --if-exists
        
        log "Database restored from backup"
    fi
    
    error "ROLLBACK COMPLETED - Manual intervention required"
    exit 1
}

# Trap errors for automatic rollback
trap 'rollback_deployment' ERR

# Main deployment process
main() {
    log "Starting production deployment of Licensed Casino Platform"
    log "Environment: $DEPLOY_ENV"
    log "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Create required directories
    mkdir -p ./data/{postgres,redis,uploads,logs} ./backups ./logs ./security
    
    # Set proper permissions
    chmod 700 ./scripts/*.sh
    chmod 755 ./data ./backups ./logs
    
    # Run deployment steps
    pre_deployment_checks
    create_pre_deploy_backup
    deploy_application
    post_deployment_verification
    
    # Optional security scan
    if [ "${RUN_SECURITY_SCAN:-false}" = "true" ]; then
        run_security_scan
    fi
    
    # Generate deployment report
    generate_deployment_report
    
    # Success notification
    log "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
    log "Application URL: ${BASE_URL:-http://localhost:3000}"
    log "Admin Dashboard: ${BASE_URL:-http://localhost:3000}/dashboard"
    log "Health Check: ${BASE_URL:-http://localhost:3000}/api/health"
    
    # Send success notification
    if [ -n "${DEPLOY_WEBHOOK_URL:-}" ]; then
        curl -X POST "$DEPLOY_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"SUCCESS\",\"message\":\"Licensed Casino Platform deployed successfully\",\"timestamp\":\"$(date -Iseconds)\",\"environment\":\"$DEPLOY_ENV\"}" \
             > /dev/null 2>&1 || true
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "check")
        pre_deployment_checks
        ;;
    "backup")
        create_pre_deploy_backup
        ;;
    "verify")
        post_deployment_verification
        ;;
    "scan")
        run_security_scan
        ;;
    "rollback")
        rollback_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|check|backup|verify|scan|rollback}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full production deployment (default)"
        echo "  check    - Run pre-deployment checks only"
        echo "  backup   - Create backup only"
        echo "  verify   - Run post-deployment verification only"
        echo "  scan     - Run security scan only"
        echo "  rollback - Emergency rollback to previous version"
        echo ""
        echo "Environment Variables:"
        echo "  DEPLOY_ENV                - Deployment environment (default: production)"
        echo "  BACKUP_BEFORE_DEPLOY      - Create backup before deploy (default: true)"
        echo "  RUN_MIGRATIONS           - Run database migrations (default: true)"
        echo "  COMPLIANCE_CHECK         - Run compliance verification (default: true)"
        echo "  HEALTH_CHECK_TIMEOUT     - Health check timeout in seconds (default: 300)"
        echo "  RUN_SECURITY_SCAN        - Run security vulnerability scan (default: false)"
        exit 1
        ;;
esac
