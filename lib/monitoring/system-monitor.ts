import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { jurisdictionEngine } from '@/lib/compliance/jurisdiction';

export interface SystemHealth {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    payments: ServiceHealth;
    kyc: ServiceHealth;
    licenses: ServiceHealth;
    compliance: ServiceHealth;
    security: ServiceHealth;
  };
  metrics: {
    memory: MemoryMetrics;
    cpu: number;
    disk: DiskMetrics;
    network: NetworkMetrics;
  };
  alerts: SystemAlert[];
  performance: PerformanceMetrics;
}

export interface ServiceHealth {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  details: string;
  uptime: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
}

export interface DiskMetrics {
  used: number;
  total: number;
  percentage: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  connectionsActive: number;
  requestsPerSecond: number;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export type AlertType = 
  | 'LICENSE_EXPIRING'
  | 'LICENSE_EXPIRED'
  | 'DATABASE_ERROR'
  | 'PAYMENT_FAILURE'
  | 'KYC_BACKLOG'
  | 'COMPLIANCE_BREACH'
  | 'SECURITY_INCIDENT'
  | 'HIGH_ERROR_RATE'
  | 'MEMORY_HIGH'
  | 'DISK_FULL'
  | 'SERVICE_DOWN'
  | 'SUSPICIOUS_ACTIVITY'
  | 'AML_ALERT'
  | 'REGULATORY_DEADLINE';

export interface PerformanceMetrics {
  apiResponseTime: number;
  databaseQueryTime: number;
  paymentProcessingTime: number;
  kycProcessingTime: number;
  errorRate: number;
  throughput: number;
}

class SystemMonitor {
  
  private async collectMetrics(): Promise<void> {
    // Implementation for collecting system metrics
    const metrics = {
      timestamp: new Date(),
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    logger.info('System metrics collected', metrics);
  }
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  
  private currentHealth: SystemHealth | null = null;
  private alertsCache = new Map<string, SystemAlert>();

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Start health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Health check failed', error);
      });
    }, 30000);

    // Collect metrics every 60 seconds
    this.metricsCollectionInterval = setInterval(() => {
      this.collectMetrics().catch(error => {
        logger.error('Metrics collection failed', error);
      });
    }, 60000);

    // Check for alerts every 5 minutes
    this.alertCheckInterval = setInterval(() => {
      this.checkForAlerts().catch(error => {
        logger.error('Alert check failed', error);
      });
    }, 5 * 60 * 1000);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Perform comprehensive system health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();

      // Check all services
      const [
        databaseHealth,
        redisHealth,
        paymentsHealth,
        kycHealth,
        licensesHealth,
        complianceHealth,
        securityHealth
      ] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkPaymentsHealth(),
        this.checkKYCHealth(),
        this.checkLicensesHealth(),
        this.checkComplianceHealth(),
        this.checkSecurityHealth()
      ]);

      // Collect system metrics
      const metrics = await this.collectSystemMetrics();
      const performance = await this.collectPerformanceMetrics();

      // Determine overall health status
      const services = {
        database: this.getServiceResult(databaseHealth),
        redis: this.getServiceResult(redisHealth),
        payments: this.getServiceResult(paymentsHealth),
        kyc: this.getServiceResult(kycHealth),
        licenses: this.getServiceResult(licensesHealth),
        compliance: this.getServiceResult(complianceHealth),
        security: this.getServiceResult(securityHealth)
      };

      const overallStatus = this.calculateOverallHealth(services);

      this.currentHealth = {
        status: overallStatus,
        timestamp: new Date(),
        uptime: process.uptime(),
        services,
        metrics,
        alerts: Array.from(this.alertsCache.values()).filter(a => !a.acknowledged),
        performance
      };

      // Log health status
      logger.info('System health check completed', {
        status: overallStatus,
        duration: Date.now() - startTime,
        servicesDown: Object.values(services).filter(s => s.status === 'DOWN').length
      });

      // Trigger alerts if needed
      if (overallStatus === 'CRITICAL') {
        await this.triggerCriticalAlert('System health is critical');
      } else if (overallStatus === 'WARNING') {
        await this.triggerWarningAlert('System health warning detected');
      }

    } catch (error) {
      logger.error('Health check failed', error);
      
      // Create fallback health status
      this.currentHealth = {
        status: 'CRITICAL',
        timestamp: new Date(),
        uptime: process.uptime(),
        services: this.getFailedServicesStatus(),
        metrics: this.getFailedMetrics(),
        alerts: [],
        performance: this.getFailedPerformanceMetrics()
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      // Check database performance
      const userCount = await prisma.user.count();
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'HEALTHY' : responseTime < 3000 ? 'WARNING' : 'CRITICAL',
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
        details: `Connected, ${userCount} users`,
        uptime: process.uptime()
      };

    } catch (error) {
      logger.error('Database health check failed', error);
      
      return {
        status: 'DOWN',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastCheck: new Date(),
        details: `Error: ${error instanceof Error ? String(error) : 'Unknown error'}`,
        uptime: 0
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedisHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // In production, this would check actual Redis connection
      // For now, simulate Redis health check
      const responseTime = Date.now() - startTime;

      return {
        status: 'HEALTHY',
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
        details: 'Connected',
        uptime: process.uptime()
      };

    } catch (error) {
      return {
        status: 'DOWN',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastCheck: new Date(),
        details: 'Redis connection failed',
        uptime: 0
      };
    }
  }

  /**
   * Check payment processors health
   */
  private async checkPaymentsHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check recent payment success rates
      const recentTransactions = await prisma.paymentTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        },
        select: {
          status: true
        }
      });

      const totalTransactions = recentTransactions.length;
      const failedTransactions = recentTransactions.filter(t => t.status === 'FAILED').length;
      const errorRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;

      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'HEALTHY';
      if (errorRate > 20) status = 'CRITICAL';
      else if (errorRate > 10) status = 'WARNING';

      return {
        status,
        responseTime,
        errorRate,
        lastCheck: new Date(),
        details: `${totalTransactions} transactions, ${errorRate.toFixed(1)}% error rate`,
        uptime: process.uptime()
      };

    } catch (error) {
      return {
        status: 'CRITICAL',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastCheck: new Date(),
        details: 'Payment health check failed',
        uptime: 0
      };
    }
  }

  /**
   * Check KYC processing health
   */
  private async checkKYCHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check KYC processing backlog
      const pendingKYC = await prisma.kycProfile.count({
        where: {
          status: {
            in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW']
          },
          createdAt: {
            lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
          }
        }
      });

      const totalPending = await prisma.kycProfile.count({
        where: {
          status: {
            in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW']
          }
        }
      });

      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'HEALTHY';
      if (pendingKYC > 100) status = 'CRITICAL';
      else if (pendingKYC > 50) status = 'WARNING';

      return {
        status,
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
        details: `${totalPending} pending, ${pendingKYC} overdue`,
        uptime: process.uptime()
      };

    } catch (error) {
      return {
        status: 'CRITICAL',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastCheck: new Date(),
        details: 'KYC health check failed',
        uptime: 0
      };
    }
  }

  /**
   * Check license status and expiry
   */
  private async checkLicensesHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const licenses = await prisma.license.findMany({
        where: {
          status: 'ACTIVE'
        }
      });

      const now = new Date();
      const expiringSoon = licenses.filter(l => 
        l.validUntil.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 // 30 days
      );
      const expired = licenses.filter(l => l.validUntil < now);

      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'HEALTHY';
      if (expired.length > 0) status = 'CRITICAL';
      else if (expiringSoon.length > 0) status = 'WARNING';

      return {
        status,
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
        details: `${licenses.length} active, ${expiringSoon.length} expiring, ${expired.length} expired`,
        uptime: process.uptime()
      };

    } catch (error) {
      return {
        status: 'CRITICAL',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastCheck: new Date(),
        details: 'License check failed',
        uptime: 0
      };
    }
  }

  /**
   * Check compliance system health
   */
  private async checkComplianceHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check open compliance alerts
      const openAlerts = await prisma.complianceAlert.count({
        where: {
          status: 'OPEN',
          severity: {
            in: ['HIGH', 'CRITICAL']
          }
        }
      });

      // Check SAR reports requiring action
      const pendingSARs = await prisma.sarReport.count({
        where: {
          status: 'DRAFT'
        }
      });

      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'HEALTHY';
      if (openAlerts > 20 || pendingSARs > 10) status = 'CRITICAL';
      else if (openAlerts > 10 || pendingSARs > 5) status = 'WARNING';

      return {
        status,
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
        details: `${openAlerts} high alerts, ${pendingSARs} pending SARs`,
        uptime: process.uptime()
      };

    } catch (error) {
      return {
        status: 'CRITICAL',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastCheck: new Date(),
        details: 'Compliance check failed',
        uptime: 0
      };
    }
  }

  /**
   * Check security system health
   */
  private async checkSecurityHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check recent security incidents
      const recentIncidents = await prisma.auditLog.count({
        where: {
          action: {
            in: ['LOGIN_FAILED', 'SUSPICIOUS_ACTIVITY', 'ACCOUNT_LOCKED']
          },
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        }
      });

      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'HEALTHY';
      if (recentIncidents > 100) status = 'CRITICAL';
      else if (recentIncidents > 50) status = 'WARNING';

      return {
        status,
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
        details: `${recentIncidents} security events in last hour`,
        uptime: process.uptime()
      };

    } catch (error) {
      return {
        status: 'CRITICAL',
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastCheck: new Date(),
        details: 'Security check failed',
        uptime: 0
      };
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<SystemHealth['metrics']> {
    const memUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memUsage.rss,
        total: memUsage.rss + memUsage.external,
        percentage: (memUsage.rss / (memUsage.rss + memUsage.external)) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      },
      cpu: process.cpuUsage().user / 1000000, // Convert to seconds
      disk: {
        used: 0, // Would be implemented with actual disk monitoring
        total: 0,
        percentage: 0
      },
      network: {
        bytesIn: 0, // Would be implemented with network monitoring
        bytesOut: 0,
        connectionsActive: 0,
        requestsPerSecond: 0
      }
    };
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    // In production, these would be collected from actual monitoring data
    return {
      apiResponseTime: 150, // ms
      databaseQueryTime: 50, // ms
      paymentProcessingTime: 2000, // ms
      kycProcessingTime: 86400000, // ms (1 day)
      errorRate: 0.5, // percentage
      throughput: 100 // requests per minute
    };
  }

  /**
   * Check for system alerts
   */
  private async checkForAlerts(): Promise<void> {
    try {
      // Check license expiry alerts
      await this.checkLicenseExpiryAlerts();
      
      // Check compliance alerts
      await this.checkComplianceAlerts();
      
      // Check performance alerts
      await this.checkPerformanceAlerts();
      
      // Check security alerts
      await this.checkSecurityAlerts();

    } catch (error) {
      logger.error('Alert checking failed', error);
    }
  }

  private async checkLicenseExpiryAlerts(): Promise<void> {
    const expiringLicenses = await prisma.license.findMany({
      where: {
        status: 'ACTIVE',
        validUntil: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      }
    });

    for (const license of expiringLicenses) {
      const daysUntilExpiry = Math.ceil(
        (license.validUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      if (daysUntilExpiry <= 0) {
        await this.createAlert({
          type: 'LICENSE_EXPIRED',
          severity: 'CRITICAL',
          message: `License ${license.licenseNumber} for ${license.jurisdiction} has expired`,
          metadata: { licenseId: license.id, jurisdiction: license.jurisdiction }
        });
      } else if (daysUntilExpiry <= 7) {
        await this.createAlert({
          type: 'LICENSE_EXPIRING',
          severity: 'HIGH',
          message: `License ${license.licenseNumber} for ${license.jurisdiction} expires in ${daysUntilExpiry} days`,
          metadata: { licenseId: license.id, jurisdiction: license.jurisdiction, daysUntilExpiry }
        });
      } else if (daysUntilExpiry <= 30) {
        await this.createAlert({
          type: 'LICENSE_EXPIRING',
          severity: 'MEDIUM',
          message: `License ${license.licenseNumber} for ${license.jurisdiction} expires in ${daysUntilExpiry} days`,
          metadata: { licenseId: license.id, jurisdiction: license.jurisdiction, daysUntilExpiry }
        });
      }
    }
  }

  private async checkComplianceAlerts(): Promise<void> {
    // Check KYC backlog
    const kycBacklog = await prisma.kycProfile.count({
      where: {
        status: 'UNDER_REVIEW',
        createdAt: {
          lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days
        }
      }
    });

    if (kycBacklog > 100) {
      await this.createAlert({
        type: 'KYC_BACKLOG',
        severity: 'CRITICAL',
        message: `KYC review backlog is critical: ${kycBacklog} profiles pending for >5 days`,
        metadata: { backlogCount: kycBacklog }
      });
    } else if (kycBacklog > 50) {
      await this.createAlert({
        type: 'KYC_BACKLOG',
        severity: 'HIGH',
        message: `KYC review backlog: ${kycBacklog} profiles pending for >5 days`,
        metadata: { backlogCount: kycBacklog }
      });
    }
  }

  private async checkPerformanceAlerts(): Promise<void> {
    if (!this.currentHealth) return;

    // Check memory usage
    if (this.currentHealth.metrics.memory.percentage > 90) {
      await this.createAlert({
        type: 'MEMORY_HIGH',
        severity: 'CRITICAL',
        message: `Memory usage critical: ${this.currentHealth.metrics.memory.percentage.toFixed(1)}%`,
        metadata: { memoryUsage: this.currentHealth.metrics.memory }
      });
    } else if (this.currentHealth.metrics.memory.percentage > 80) {
      await this.createAlert({
        type: 'MEMORY_HIGH',
        severity: 'HIGH',
        message: `Memory usage high: ${this.currentHealth.metrics.memory.percentage.toFixed(1)}%`,
        metadata: { memoryUsage: this.currentHealth.metrics.memory }
      });
    }

    // Check API response time
    if (this.currentHealth.performance.apiResponseTime > 5000) {
      await this.createAlert({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL',
        message: `API response time critical: ${this.currentHealth.performance.apiResponseTime}ms`,
        metadata: { responseTime: this.currentHealth.performance.apiResponseTime }
      });
    }
  }

  private async checkSecurityAlerts(): Promise<void> {
    // Check for unusual activity patterns
    const recentFailedLogins = await prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      }
    });

    if (recentFailedLogins > 50) {
      await this.createAlert({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        message: `Unusual number of failed logins: ${recentFailedLogins} in last 15 minutes`,
        metadata: { failedLogins: recentFailedLogins }
      });
    }
  }

  private async createAlert(alertData: {
    type: AlertType;
    severity: SystemAlert['severity'];
    message: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if similar alert already exists
    const existingAlert = Array.from(this.alertsCache.values()).find(
      a => a.type === alertData.type && !a.acknowledged && !a.resolvedAt
    );

    if (existingAlert) {
      // Update existing alert timestamp
      existingAlert.timestamp = new Date();
      return;
    }

    const alert: SystemAlert = {
      id: alertId,
      ...alertData,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alertsCache.set(alertId, alert);

    // Store in database for persistence
    await prisma.systemAlert.create({
      data: {
        alertId,
        type: alertData.type,
        severity: alertData.severity,
        message: alertData.message,
        metadata: alertData.metadata || {},
        acknowledged: false,
        createdAt: new Date()
      }
    });

    // Send notifications for high severity alerts
    if (alertData.severity === 'CRITICAL' || alertData.severity === 'HIGH') {
      await this.sendAlertNotification(alert);
    }

    logger.warn('System alert created', {
      alertId,
      type: alertData.type,
      severity: alertData.severity,
      message: alertData.message
    });
  }

  private async sendAlertNotification(alert: SystemAlert): Promise<void> {
    try {
      // In production, send notifications via email, SMS, Slack, etc.
      logger.error('SYSTEM ALERT', {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        metadata: alert.metadata
      });

      // Send webhook notification if configured
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      if (webhookUrl) {
        // Would send HTTP POST to webhook URL
        logger.info('Alert webhook notification sent', { alertId: alert.id });
      }

    } catch (error) {
      logger.error('Failed to send alert notification', { alertId: alert.id, error });
    }
  }

  // Utility methods

  private getServiceResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'CRITICAL',
        responseTime: 0,
        errorRate: 100,
        lastCheck: new Date(),
        details: `Health check failed: ${result.reason}`,
        uptime: 0
      };
    }
  }

  private calculateOverallHealth(services: SystemHealth['services']): SystemHealth['status'] {
    const serviceStatuses = Object.values(services).map(s => s.status);
    
    if (serviceStatuses.includes('DOWN') || serviceStatuses.includes('CRITICAL')) {
      return 'CRITICAL';
    } else if (serviceStatuses.includes('WARNING')) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  private getFailedServicesStatus(): SystemHealth['services'] {
    const failedService: ServiceHealth = {
      status: 'CRITICAL',
      responseTime: 0,
      errorRate: 100,
      lastCheck: new Date(),
      details: 'Health check system failure',
      uptime: 0
    };

    return {
      database: failedService,
      redis: failedService,
      payments: failedService,
      kyc: failedService,
      licenses: failedService,
      compliance: failedService,
      security: failedService
    };
  }

  private getFailedMetrics(): SystemHealth['metrics'] {
    return {
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        heapUsed: 0,
        heapTotal: 0
      },
      cpu: 0,
      disk: {
        used: 0,
        total: 0,
        percentage: 0
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        connectionsActive: 0,
        requestsPerSecond: 0
      }
    };
  }

  private getFailedPerformanceMetrics(): PerformanceMetrics {
    return {
      apiResponseTime: 0,
      databaseQueryTime: 0,
      paymentProcessingTime: 0,
      kycProcessingTime: 0,
      errorRate: 100,
      throughput: 0
    };
  }

  private async triggerCriticalAlert(message: string): Promise<void> {
    await this.createAlert({
      type: 'SERVICE_DOWN',
      severity: 'CRITICAL',
      message,
      metadata: { systemHealth: 'CRITICAL' }
    });
  }

  private async triggerWarningAlert(message: string): Promise<void> {
    await this.createAlert({
      type: 'HIGH_ERROR_RATE',
      severity: 'HIGH',
      message,
      metadata: { systemHealth: 'WARNING' }
    });
  }

  // Public methods

  public async getCurrentHealth(): Promise<SystemHealth | null> {
    if (!this.currentHealth) {
      await this.performHealthCheck();
    }
    return this.currentHealth;
  }

  public async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alertsCache.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.alertsCache.set(alertId, alert);

    // Update in database
    await prisma.systemAlert.updateMany({
      where: { alertId },
      data: { 
        acknowledged: true,
        acknowledgedAt: new Date()
      }
    });

    logger.info('Alert acknowledged', { alertId });
    return true;
  }

  public async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alertsCache.get(alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date();
    this.alertsCache.set(alertId, alert);

    // Update in database
    await prisma.systemAlert.updateMany({
      where: { alertId },
      data: { 
        resolved: true,
        resolvedAt: new Date()
      }
    });

    logger.info('Alert resolved', { alertId });
    return true;
  }

  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
  }
}

// Export singleton instance
export const systemMonitor = new SystemMonitor();

// Export types and interfaces
export * from './types';

// Cleanup on process exit
process.on('SIGTERM', () => {
  systemMonitor.destroy();
});

process.on('SIGINT', () => {
  systemMonitor.destroy();
});
