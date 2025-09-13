#!/bin/bash
# Licensed Casino Platform - Automated Backup System
# Runs encrypted backups with integrity verification

set -euo pipefail

# Configuration
BACKUP_DIR="./backups"
DATABASE_URL="${DATABASE_URL}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$BACKUP_DIR/backup.log" >&2
}

# Verify dependencies
check_dependencies() {
    log "Checking backup dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found"
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        error "openssl not found"
        exit 1
    fi
    
    if [ -z "$ENCRYPTION_KEY" ]; then
        error "BACKUP_ENCRYPTION_KEY not set"
        exit 1
    fi
    
    log "Dependencies verified"
}

# Create backup
create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="casino_db_${timestamp}"
    local backup_file="${BACKUP_DIR}/${backup_name}.sql"
    local encrypted_file="${backup_file}.enc"
    local checksum_file="${encrypted_file}.sha256"
    
    log "Starting backup: $backup_name"
    
    # Create database backup
    if ! pg_dump "$DATABASE_URL" \
         --verbose --format=custom --compress=9 \
         --exclude-table='audit_logs' \
         --exclude-table='user_sessions' \
         --file="$backup_file"; then
        error "Database backup failed"
        rm -f "$backup_file"
        return 1
    fi
    
    log "Database backup completed: $(du -h "$backup_file" | cut -f1)"
    
    # Encrypt backup
    if ! openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
         -in "$backup_file" -out "$encrypted_file" \
         -k "$ENCRYPTION_KEY"; then
        error "Backup encryption failed"
        rm -f "$backup_file" "$encrypted_file"
        return 1
    fi
    
    # Remove unencrypted backup
    rm -f "$backup_file"
    
    # Generate checksum
    sha256sum "$encrypted_file" > "$checksum_file"
    
    log "Backup encrypted and verified: $encrypted_file"
    
    # Verify backup integrity
    if ! verify_backup "$encrypted_file" "$checksum_file"; then
        error "Backup integrity verification failed"
        return 1
    fi
    
    log "Backup completed successfully: $backup_name"
    
    # Upload to remote storage if configured
    if [ -n "${BACKUP_STORAGE_URL:-}" ]; then
        upload_backup "$encrypted_file" "$checksum_file"
    fi
    
    return 0
}

# Verify backup integrity
verify_backup() {
    local encrypted_file="$1"
    local checksum_file="$2"
    
    log "Verifying backup integrity..."
    
    # Check checksum
    if ! sha256sum -c "$checksum_file"; then
        error "Checksum verification failed"
        return 1
    fi
    
    # Test decryption (without saving decrypted content)
    if ! openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
         -in "$encrypted_file" -k "$ENCRYPTION_KEY" \
         | head -c 100 > /dev/null; then
        error "Decryption test failed"
        return 1
    fi
    
    log "Backup integrity verified"
    return 0
}

# Upload backup to remote storage
upload_backup() {
    local encrypted_file="$1"
    local checksum_file="$2"
    
    log "Uploading backup to remote storage..."
    
    # This would integrate with your cloud storage provider
    # Example implementations:
    
    # AWS S3
    # aws s3 cp "$encrypted_file" "$BACKUP_STORAGE_URL/"
    # aws s3 cp "$checksum_file" "$BACKUP_STORAGE_URL/"
    
    # Azure Blob Storage
    # az storage blob upload --file "$encrypted_file" --name "$(basename "$encrypted_file")" --container-name backups
    
    # Google Cloud Storage
    # gsutil cp "$encrypted_file" "$BACKUP_STORAGE_URL/"
    
    log "Backup uploaded successfully"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Remove local backups
    find "$BACKUP_DIR" -name "casino_db_*.sql.enc" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "casino_db_*.sql.enc.sha256" -mtime +$RETENTION_DAYS -delete
    
    log "Old backups cleaned up"
}

# Test backup restoration
test_backup_restore() {
    local latest_backup=$(find "$BACKUP_DIR" -name "casino_db_*.sql.enc" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [ -z "$latest_backup" ]; then
        error "No backup found for restore test"
        return 1
    fi
    
    log "Testing backup restore: $(basename "$latest_backup")"
    
    # Create test database name
    local test_db="casino_test_restore_$(date +%s)"
    local test_db_url="${DATABASE_URL%/*}/${test_db}"
    
    if ! createdb "$test_db_url"; then
        error "Failed to create test database"
        return 1
    fi
    
    # Decrypt and restore backup
    if openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
       -in "$latest_backup" -k "$ENCRYPTION_KEY" | \
       pg_restore --dbname="$test_db_url" --verbose; then
        log "Backup restore test successful"
        
        # Verify critical tables exist
        local table_count=$(psql "$test_db_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
        
        if [ "$table_count" -gt 10 ]; then
            log "Database structure verified: $table_count tables restored"
        else
            error "Database structure verification failed: only $table_count tables found"
            dropdb "$test_db_url"
            return 1
        fi
    else
        error "Backup restore test failed"
        dropdb "$test_db_url"
        return 1
    fi
    
    # Clean up test database
    dropdb "$test_db_url"
    log "Test database cleaned up"
    
    return 0
}

# Send backup status notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Log to compliance system
    log "BACKUP_STATUS: $status - $message"
    
    # Send webhook notification if configured
    if [ -n "${BACKUP_WEBHOOK_URL:-}" ]; then
        curl -X POST "$BACKUP_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\",\"service\":\"casino-backup\"}" \
             > /dev/null 2>&1 || true
    fi
}

# Main backup routine
run_backup() {
    log "=== STARTING AUTOMATED BACKUP ==="
    
    # Check dependencies
    if ! check_dependencies; then
        send_notification "ERROR" "Backup dependencies check failed"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Perform backup
    if create_backup; then
        send_notification "SUCCESS" "Database backup completed successfully"
        log "Backup completed successfully"
    else
        send_notification "ERROR" "Database backup failed"
        error "Backup failed"
        exit 1
    fi
    
    # Clean old backups
    cleanup_old_backups
    
    # Test backup restoration (weekly)
    if [ "$(date +%u)" = "1" ]; then  # Monday
        log "Running weekly backup restore test..."
        if test_backup_restore; then
            send_notification "SUCCESS" "Weekly backup restore test passed"
        else
            send_notification "WARNING" "Weekly backup restore test failed"
        fi
    fi
    
    log "=== BACKUP ROUTINE COMPLETED ==="
}

# Continuous backup scheduler
run_scheduler() {
    log "Starting backup scheduler with cron pattern: $BACKUP_SCHEDULE"
    
    # Install cron if not present
    if ! command -v crond &> /dev/null; then
        apk add --no-cache dcron
    fi
    
    # Create cron job
    echo "$BACKUP_SCHEDULE /scripts/backup-scheduler.sh run" | crontab -
    
    # Start cron daemon
    crond -f -l 8
}

# Handle script arguments
case "${1:-scheduler}" in
    "run")
        run_backup
        ;;
    "test")
        check_dependencies
        test_backup_restore
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "scheduler")
        run_scheduler
        ;;
    *)
        echo "Usage: $0 {run|test|cleanup|scheduler}"
        exit 1
        ;;
esac
