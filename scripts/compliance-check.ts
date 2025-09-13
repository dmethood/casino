#!/usr/bin/env tsx
/**
 * Licensed Casino Platform - Compliance Verification Script
 * Comprehensive compliance checks for production deployment
 */

import { prisma } from '../lib/db';
import { jurisdictionEngine } from '../lib/compliance/jurisdiction';
import { logger } from '../lib/logger';

interface ComplianceCheckResult {
  passed: boolean;
  category: string;
  check: string;
  result: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class ComplianceChecker {
  private results: ComplianceCheckResult[] = [];
  private criticalFailures = 0;
  private warnings = 0;

  async runAllChecks(): Promise<{ passed: boolean; summary: any }> {
    console.log('🔍 Running Licensed Casino Platform Compliance Checks...\n');

    // Core compliance checks
    await this.checkLicenseCompliance();
    await this.checkKYCAMLCompliance();
    await this.checkResponsibleGamblingCompliance();
    await this.checkPaymentCompliance();
    await this.checkDataProtectionCompliance();
    await this.checkSecurityCompliance();
    await this.checkOperationalCompliance();
    await this.checkRegulatoryReporting();

    // Generate summary
    const summary = this.generateSummary();
    
    // Print results
    this.printResults();
    
    return {
      passed: this.criticalFailures === 0,
      summary
    };
  }

  private async checkLicenseCompliance(): Promise<void> {
    console.log('📋 Checking License Compliance...');

    // Check environment configuration
    const activeLicenses = process.env.ACTIVE_LICENSES;
    if (!activeLicenses) {
      this.addResult('License', 'Environment Configuration', 'FAIL', 
        'ACTIVE_LICENSES environment variable not configured');
      return;
    }

    try {
      const licenses = JSON.parse(activeLicenses);
      
      if (!Array.isArray(licenses) || licenses.length === 0) {
        this.addResult('License', 'License Data', 'FAIL', 
          'No valid licenses configured');
        return;
      }

      // Verify each license
      for (const license of licenses) {
        const validUntil = new Date(license.validUntil);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (validUntil <= now) {
          this.addResult('License', `${license.jurisdiction} License`, 'FAIL', 
            `License ${license.licenseNumber} has expired`);
        } else if (daysUntilExpiry <= 30) {
          this.addResult('License', `${license.jurisdiction} License`, 'WARNING', 
            `License ${license.licenseNumber} expires in ${daysUntilExpiry} days`);
        } else {
          this.addResult('License', `${license.jurisdiction} License`, 'PASS', 
            `License ${license.licenseNumber} valid until ${validUntil.toDateString()}`);
        }
      }

      // Check database license records
      const dbLicenses = await prisma.license.findMany({
        where: { status: 'ACTIVE' }
      });

      this.addResult('License', 'Database Sync', 
        dbLicenses.length > 0 ? 'PASS' : 'WARNING',
        `${dbLicenses.length} active licenses in database`);

    } catch (error) {
      this.addResult('License', 'Configuration Parsing', 'FAIL', 
        `Failed to parse license configuration: ${error}`);
    }
  }

  private async checkKYCAMLCompliance(): Promise<void> {
    console.log('🔍 Checking KYC/AML Compliance...');

    // Check KYC provider configuration
    const kycApiKey = process.env.KYC_PROVIDER_API_KEY;
    const sanctionsKey = process.env.SANCTIONS_PROVIDER_KEY;
    const encryptionKey = process.env.KYC_ENCRYPTION_KEY;

    this.addResult('KYC/AML', 'Provider Configuration', 
      kycApiKey ? 'PASS' : 'FAIL',
      kycApiKey ? 'KYC provider configured' : 'KYC_PROVIDER_API_KEY not set');

    this.addResult('KYC/AML', 'Sanctions Screening', 
      sanctionsKey ? 'PASS' : 'FAIL',
      sanctionsKey ? 'Sanctions screening configured' : 'SANCTIONS_PROVIDER_KEY not set');

    this.addResult('KYC/AML', 'Data Encryption', 
      encryptionKey ? 'PASS' : 'FAIL',
      encryptionKey ? 'KYC encryption key configured' : 'KYC_ENCRYPTION_KEY not set');

    // Check KYC processing status
    try {
      const pendingKYC = await prisma.kycProfile.count({
        where: {
          status: { in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] }
        }
      });

      const overdueKYC = await prisma.kycProfile.count({
        where: {
          status: { in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] },
          createdAt: { lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
        }
      });

      this.addResult('KYC/AML', 'Processing Backlog', 
        overdueKYC < 10 ? 'PASS' : overdueKYC < 50 ? 'WARNING' : 'FAIL',
        `${pendingKYC} pending, ${overdueKYC} overdue (>5 days)`);

    } catch (error) {
      this.addResult('KYC/AML', 'Database Access', 'FAIL', 
        `Cannot access KYC data: ${error}`);
    }
  }

  private async checkResponsibleGamblingCompliance(): Promise<void> {
    console.log('🛡️ Checking Responsible Gambling Compliance...');

    // Check RG configuration
    const rgDefaultLimits = process.env.RG_DEFAULT_LIMITS;
    const realityCheckInterval = process.env.RG_REALITY_CHECK_INTERVAL;

    this.addResult('Responsible Gambling', 'Default Limits', 
      rgDefaultLimits ? 'PASS' : 'WARNING',
      rgDefaultLimits ? 'Default RG limits configured' : 'RG_DEFAULT_LIMITS not set');

    this.addResult('Responsible Gambling', 'Reality Checks', 
      realityCheckInterval ? 'PASS' : 'WARNING',
      realityCheckInterval ? `Reality check interval: ${realityCheckInterval}min` : 'Default interval will be used');

    // Check active self-exclusions
    try {
      const activeExclusions = await prisma.responsibleGamblingProfile.count({
        where: {
          status: { in: ['SELF_EXCLUDED', 'COOLING_OFF'] }
        }
      });

      this.addResult('Responsible Gambling', 'Active Exclusions', 'PASS',
        `${activeExclusions} users currently self-excluded or cooling-off`);

      // Check GAMSTOP integration for UK
      const ukUsers = await prisma.user.count({
        where: {
          kycProfile: { jurisdiction: 'GB' }
        }
      });

      if (ukUsers > 0) {
        this.addResult('Responsible Gambling', 'GAMSTOP Integration', 'WARNING',
          'GAMSTOP integration should be verified for UK users');
      }

    } catch (error) {
      this.addResult('Responsible Gambling', 'Database Access', 'FAIL',
        `Cannot access RG data: ${error}`);
    }
  }

  private async checkPaymentCompliance(): Promise<void> {
    console.log('💳 Checking Payment Compliance...');

    // Check payment processor configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const airwallexKey = process.env.AIRWALLEX_API_KEY;
    const webhookSecrets = process.env.STRIPE_WEBHOOK_SECRET && process.env.AIRWALLEX_WEBHOOK_SECRET;

    this.addResult('Payments', 'Stripe Configuration', 
      stripeKey?.startsWith('sk_live_') ? 'PASS' : 'FAIL',
      stripeKey?.startsWith('sk_live_') ? 'Stripe production key configured' : 'Stripe key missing or not production');

    this.addResult('Payments', 'Airwallex Configuration', 
      airwallexKey ? 'PASS' : 'FAIL',
      airwallexKey ? 'Airwallex production key configured' : 'AIRWALLEX_API_KEY not set');

    this.addResult('Payments', 'Webhook Security', 
      webhookSecrets ? 'PASS' : 'FAIL',
      webhookSecrets ? 'Webhook secrets configured' : 'Payment webhook secrets missing');

    // Check transaction processing
    try {
      const recentTransactions = await prisma.paymentTransaction.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      const failedTransactions = await prisma.paymentTransaction.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      const failureRate = recentTransactions > 0 ? (failedTransactions / recentTransactions) * 100 : 0;

      this.addResult('Payments', 'Transaction Health', 
        failureRate < 5 ? 'PASS' : failureRate < 15 ? 'WARNING' : 'FAIL',
        `${recentTransactions} transactions, ${failureRate.toFixed(1)}% failure rate (24h)`);

    } catch (error) {
      this.addResult('Payments', 'Transaction Monitoring', 'FAIL',
        `Cannot access transaction data: ${error}`);
    }
  }

  private async checkDataProtectionCompliance(): Promise<void> {
    console.log('🔒 Checking Data Protection Compliance...');

    // Check encryption configuration
    const adminEncKey = process.env.ADMIN_ENCRYPTION_KEY;
    const kycEncKey = process.env.KYC_ENCRYPTION_KEY;
    const backupEncKey = process.env.BACKUP_ENCRYPTION_KEY;

    this.addResult('Data Protection', 'Admin Data Encryption', 
      adminEncKey ? 'PASS' : 'FAIL',
      adminEncKey ? 'Admin encryption key configured' : 'ADMIN_ENCRYPTION_KEY not set');

    this.addResult('Data Protection', 'KYC Data Encryption', 
      kycEncKey ? 'PASS' : 'FAIL',
      kycEncKey ? 'KYC encryption key configured' : 'KYC_ENCRYPTION_KEY not set');

    this.addResult('Data Protection', 'Backup Encryption', 
      backupEncKey ? 'PASS' : 'FAIL',
      backupEncKey ? 'Backup encryption key configured' : 'BACKUP_ENCRYPTION_KEY not set');

    // Check GDPR compliance settings
    const dpoEmail = process.env.GDPR_DATA_CONTROLLER_EMAIL;
    const retentionYears = process.env.DOCUMENT_RETENTION_YEARS;

    this.addResult('Data Protection', 'GDPR Configuration', 
      dpoEmail && retentionYears ? 'PASS' : 'WARNING',
      `DPO email: ${dpoEmail ? 'Set' : 'Missing'}, Retention: ${retentionYears || 'Default'} years`);
  }

  private async checkSecurityCompliance(): Promise<void> {
    console.log('🔐 Checking Security Compliance...');

    // Check authentication configuration
    const jwtSecret = process.env.JWT_SECRET;
    const sessionSecret = process.env.SESSION_SECRET;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    this.addResult('Security', 'Authentication Secrets', 
      jwtSecret && sessionSecret && nextAuthSecret ? 'PASS' : 'FAIL',
      'Authentication secrets configured');

    // Check 2FA enforcement
    const admin2FA = process.env.ADMIN_2FA_ENFORCED;
    this.addResult('Security', '2FA Enforcement', 
      admin2FA === 'true' ? 'PASS' : 'FAIL',
      admin2FA === 'true' ? 'Admin 2FA enforced' : 'Admin 2FA not enforced');

    // Check IP restrictions
    const adminIPWhitelist = process.env.ADMIN_IP_WHITELIST;
    this.addResult('Security', 'Admin IP Restrictions', 
      adminIPWhitelist ? 'PASS' : 'WARNING',
      adminIPWhitelist ? 'Admin IP whitelist configured' : 'No IP restrictions configured');

    // Check rate limiting
    const rateLimitConfig = process.env.RATE_LIMIT_WINDOW_MS && process.env.RATE_LIMIT_MAX_REQUESTS;
    this.addResult('Security', 'Rate Limiting', 
      rateLimitConfig ? 'PASS' : 'WARNING',
      rateLimitConfig ? 'Rate limiting configured' : 'Using default rate limits');
  }

  private async checkOperationalCompliance(): Promise<void> {
    console.log('⚙️ Checking Operational Compliance...');

    // Check logging configuration
    const logLevel = process.env.LOG_LEVEL;
    const auditRetention = process.env.AUDIT_LOG_RETENTION_DAYS;

    this.addResult('Operations', 'Logging Configuration', 
      logLevel && auditRetention ? 'PASS' : 'WARNING',
      `Log level: ${logLevel || 'default'}, Audit retention: ${auditRetention || 'default'} days`);

    // Check monitoring configuration
    const monitoringKey = process.env.MONITORING_API_KEY;
    const alertWebhook = process.env.ALERT_WEBHOOK_URL;

    this.addResult('Operations', 'Monitoring Setup', 
      monitoringKey || alertWebhook ? 'PASS' : 'WARNING',
      'Monitoring and alerting configuration present');

    // Check backup configuration
    const backupSchedule = process.env.BACKUP_SCHEDULE;
    const backupStorage = process.env.BACKUP_STORAGE_URL;

    this.addResult('Operations', 'Backup Configuration', 
      backupSchedule ? 'PASS' : 'WARNING',
      `Backup schedule: ${backupSchedule || 'default'}, Remote storage: ${backupStorage ? 'configured' : 'local only'}`);
  }

  private async checkRegulatoryReporting(): Promise<void> {
    console.log('📊 Checking Regulatory Reporting...');

    // Check reporting endpoints
    const ukgcEndpoint = process.env.UKGC_REPORTING_ENDPOINT;
    const mgaEndpoint = process.env.MGA_REPORTING_ENDPOINT;
    const sarEndpoint = process.env.SAR_FILING_ENDPOINT;

    this.addResult('Reporting', 'UKGC Reporting', 
      ukgcEndpoint ? 'PASS' : 'WARNING',
      ukgcEndpoint ? 'UKGC reporting endpoint configured' : 'UKGC reporting not configured');

    this.addResult('Reporting', 'MGA Reporting', 
      mgaEndpoint ? 'PASS' : 'WARNING',
      mgaEndpoint ? 'MGA reporting endpoint configured' : 'MGA reporting not configured');

    this.addResult('Reporting', 'SAR Filing', 
      sarEndpoint ? 'PASS' : 'WARNING',
      sarEndpoint ? 'SAR filing endpoint configured' : 'SAR filing not configured');

    // Check compliance alerts
    try {
      const openAlerts = await prisma.complianceAlert.count({
        where: { status: 'OPEN', severity: { in: ['HIGH', 'CRITICAL'] } }
      });

      this.addResult('Reporting', 'Open Compliance Alerts', 
        openAlerts < 5 ? 'PASS' : openAlerts < 20 ? 'WARNING' : 'FAIL',
        `${openAlerts} high/critical alerts open`);

    } catch (error) {
      this.addResult('Reporting', 'Alert System', 'FAIL',
        `Cannot access compliance alerts: ${error}`);
    }
  }

  private addResult(category: string, check: string, result: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any): void {
    this.results.push({
      passed: result === 'PASS',
      category,
      check,
      result,
      message,
      details
    });

    if (result === 'FAIL') {
      this.criticalFailures++;
      console.log(`❌ ${category} - ${check}: ${message}`);
    } else if (result === 'WARNING') {
      this.warnings++;
      console.log(`⚠️  ${category} - ${check}: ${message}`);
    } else {
      console.log(`✅ ${category} - ${check}: ${message}`);
    }
  }

  private generateSummary() {
    const totalChecks = this.results.length;
    const passed = this.results.filter(r => r.result === 'PASS').length;
    const failed = this.criticalFailures;
    const warnings = this.warnings;

    return {
      totalChecks,
      passed,
      failed,
      warnings,
      passRate: totalChecks > 0 ? (passed / totalChecks) * 100 : 0,
      overallStatus: failed === 0 ? (warnings === 0 ? 'COMPLIANT' : 'COMPLIANT_WITH_WARNINGS') : 'NON_COMPLIANT',
      categories: this.getCategorySummary()
    };
  }

  private getCategorySummary() {
    const categories = [...new Set(this.results.map(r => r.category))];
    
    return categories.map(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.result === 'PASS').length;
      const failed = categoryResults.filter(r => r.result === 'FAIL').length;
      const warnings = categoryResults.filter(r => r.result === 'WARNING').length;
      
      return {
        category,
        total: categoryResults.length,
        passed,
        failed,
        warnings,
        status: failed === 0 ? (warnings === 0 ? 'COMPLIANT' : 'COMPLIANT_WITH_WARNINGS') : 'NON_COMPLIANT'
      };
    });
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🏛️  LICENSED CASINO PLATFORM COMPLIANCE REPORT');
    console.log('='.repeat(80));

    const summary = this.generateSummary();
    
    console.log(`\n📈 OVERALL STATUS: ${summary.overallStatus}`);
    console.log(`✅ Checks Passed: ${summary.passed}/${summary.totalChecks} (${summary.passRate.toFixed(1)}%)`);
    console.log(`❌ Critical Failures: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);

    console.log('\n📋 CATEGORY BREAKDOWN:');
    summary.categories.forEach(cat => {
      const statusIcon = cat.status === 'COMPLIANT' ? '✅' :
                        cat.status === 'COMPLIANT_WITH_WARNINGS' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${cat.category}: ${cat.passed}/${cat.total} passed`);
    });

    if (summary.failed > 0) {
      console.log('\n❌ CRITICAL FAILURES:');
      this.results.filter(r => r.result === 'FAIL').forEach(result => {
        console.log(`   • ${result.category} - ${result.check}: ${result.message}`);
      });
    }

    if (summary.warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.filter(r => r.result === 'WARNING').forEach(result => {
        console.log(`   • ${result.category} - ${result.check}: ${result.message}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    if (summary.failed === 0) {
      console.log('🎉 COMPLIANCE CHECK PASSED - Platform ready for licensed operation');
    } else {
      console.log('🚫 COMPLIANCE CHECK FAILED - Address critical failures before deployment');
    }
    
    console.log('='.repeat(80));
  }
}

// Main execution
async function main() {
  try {
    const checker = new ComplianceChecker();
    const result = await checker.runAllChecks();
    
    // Log results to database for audit trail
    await prisma.complianceLog.create({
      data: {
        checkType: 'DEPLOYMENT_COMPLIANCE_VERIFICATION',
        result: result.passed ? 'PASSED' : 'FAILED',
        details: result.summary,
        ip: 'deployment-script',
        createdAt: new Date()
      }
    });

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Compliance check failed:', error);
    logger.error('Compliance check script failed', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
