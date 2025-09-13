import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export interface Permission {
  action: string; // e.g., 'CREATE', 'READ', 'UPDATE', 'DELETE'
  resource: string; // e.g., 'USER', 'TRANSACTION', 'KYC'
  conditions?: Record<string, any>; // Additional conditions
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean; // Cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
  permissions: Permission[];
  lastLoginAt?: Date;
  twoFactorEnabled: boolean;
  ipRestrictions?: string[]; // Allowed IP addresses/ranges
  sessionExpiresAt?: Date;
}

export interface AccessLog {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  granted: boolean;
  reason?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Role-Based Access Control Manager
 * Handles permissions, roles, and access control for admin users
 */
export class RBACManager {
  private permissionCache = new Map<string, Permission[]>();
  private cacheExpiryTime = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeSystemRoles();
  }

  /**
   * Initialize default system roles
   */
  private async initializeSystemRoles(): Promise<void> {
    try {
      const systemRoles = [
        {
          name: 'SUPER_ADMIN',
          description: 'Full system access with all permissions',
          permissions: this.getAllPermissions(),
          isSystemRole: true,
        },
        {
          name: 'COMPLIANCE_OFFICER',
          description: 'Compliance monitoring, KYC/AML management, alerts',
          permissions: this.getCompliancePermissions(),
          isSystemRole: true,
        },
        {
          name: 'RISK_MANAGER',
          description: 'Risk assessment, transaction monitoring, limits management',
          permissions: this.getRiskPermissions(),
          isSystemRole: true,
        },
        {
          name: 'CUSTOMER_SUPPORT',
          description: 'Customer service, basic account management',
          permissions: this.getSupportPermissions(),
          isSystemRole: true,
        },
        {
          name: 'FINANCIAL_CONTROLLER',
          description: 'Payment processing, financial reconciliation',
          permissions: this.getFinancialPermissions(),
          isSystemRole: true,
        },
        {
          name: 'AUDIT_REVIEWER',
          description: 'Read-only access to audit logs and compliance data',
          permissions: this.getAuditPermissions(),
          isSystemRole: true,
        },
      ];

      for (const role of systemRoles) {
        const existing = await prisma.systemConfig.findUnique({
          where: { key: `role_${role.name}` },
        });

        if (!existing) {
          await prisma.systemConfig.create({
            data: {
              key: `role_${role.name}`,
              value: JSON.stringify(role),
              type: 'JSON',
              description: `System role: ${role.description}`,
            },
          });

          logger.info('System role initialized', { role: role.name });
        }
      }

    } catch (error) {
      logger.error('Failed to initialize system roles', error);
    }
  }

  /**
   * Check if user has permission to perform an action
   */
  public async checkPermission(
    userId: string,
    action: string,
    resource: string,
    context?: {
      resourceId?: string;
      ipAddress?: string;
      additionalData?: Record<string, any>;
    }
  ): Promise<{ granted: boolean; reason?: string }> {
    try {
      // Get user with roles and permissions
      const user = await this.getUserWithPermissions(userId);
      if (!user) {
        return { granted: false, reason: 'User not found' };
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        return { granted: false, reason: `User status: ${user.status}` };
      }

      // Check IP restrictions
      if (context?.ipAddress && user.ipRestrictions) {
        const ipAllowed = this.checkIPRestriction(context.ipAddress, user.ipRestrictions);
        if (!ipAllowed) {
          return { granted: false, reason: 'IP address not allowed' };
        }
      }

      // Check session expiry
      if (user.sessionExpiresAt && new Date() > user.sessionExpiresAt) {
        return { granted: false, reason: 'Session expired' };
      }

      // Check permissions
      const hasPermission = this.evaluatePermissions(
        user.permissions,
        action,
        resource,
        context
      );

      const result = {
        granted: hasPermission,
        reason: hasPermission ? undefined : 'Permission denied',
      };

      // Log access attempt
      await this.logAccess({
        userId,
        action,
        resource,
        resourceId: context?.resourceId,
        granted: result.granted,
        reason: result.reason,
        ipAddress: context?.ipAddress || '',
        timestamp: new Date(),
      });

      return result;

    } catch (error) {
      logger.error('Permission check failed', { userId, action, resource, error });
      return { granted: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Get user with roles and permissions
   */
  private async getUserWithPermissions(userId: string): Promise<AdminUser | null> {
    try {
      // Check cache first
      const cacheKey = `user_permissions_${userId}`;
      const cached = this.permissionCache.get(cacheKey);
      
      if (cached) {
        return {
          id: userId,
          email: '',
          firstName: '',
          lastName: '',
          role: '',
          status: 'ACTIVE',
          permissions: cached,
          twoFactorEnabled: false,
        };
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role === 'PLAYER') {
        return null;
      }

      // Get role permissions
      const permissions = await this.getRolePermissions(user.role);

      // Cache permissions
      this.permissionCache.set(cacheKey, permissions);
      setTimeout(() => {
        this.permissionCache.delete(cacheKey);
      }, this.cacheExpiryTime);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
        permissions,
        lastLoginAt: user.lastLoginAt || undefined,
        twoFactorEnabled: user.twoFactorEnabled,
        sessionExpiresAt: user.sessionExpiresAt || undefined,
      };

    } catch (error) {
      logger.error('Failed to get user permissions', { userId, error });
      return null;
    }
  }

  /**
   * Get permissions for a role
   */
  private async getRolePermissions(roleName: string): Promise<Permission[]> {
    try {
      const roleConfig = await prisma.systemConfig.findUnique({
        where: { key: `role_${roleName}` },
      });

      if (!roleConfig) {
        logger.warn('Role not found', { role: roleName });
        return [];
      }

      const role = JSON.parse(roleConfig.value);
      return role.permissions || [];

    } catch (error) {
      logger.error('Failed to get role permissions', { role: roleName, error });
      return [];
    }
  }

  /**
   * Evaluate if permissions allow the action
   */
  private evaluatePermissions(
    permissions: Permission[],
    action: string,
    resource: string,
    context?: any
  ): boolean {
    for (const permission of permissions) {
      if (this.matchesPermission(permission, action, resource, context)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a permission matches the requested action
   */
  private matchesPermission(
    permission: Permission,
    action: string,
    resource: string,
    context?: any
  ): boolean {
    // Check action match
    if (permission.action !== '*' && permission.action !== action) {
      return false;
    }

    // Check resource match
    if (permission.resource !== '*' && permission.resource !== resource) {
      return false;
    }

    // Check conditions if present
    if (permission.conditions && context) {
      for (const [key, value] of Object.entries(permission.conditions)) {
        if (context[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check IP address against restrictions
   */
  private checkIPRestriction(ipAddress: string, allowedIPs: string[]): boolean {
    for (const allowedIP of allowedIPs) {
      if (this.matchesIPPattern(ipAddress, allowedIP)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if IP matches pattern (supports CIDR and wildcards)
   */
  private matchesIPPattern(ip: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === ip) return true;

    // Simple wildcard matching (could be enhanced for CIDR)
    if (pattern.includes('*')) {
      const regex = pattern.replace(/\*/g, '\\d+');
      return new RegExp(`^${regex}$`).test(ip);
    }

    return false;
  }

  /**
   * Create a new admin user
   */
  public async createAdminUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    password: string;
    ipRestrictions?: string[];
    createdBy: string;
  }): Promise<{ userId: string; tempPassword?: string }> {
    try {
      // Validate role exists
      const rolePermissions = await this.getRolePermissions(data.role);
      if (rolePermissions.length === 0) {
        throw new Error('Invalid role');
      }

      // Generate secure password if not provided
      const tempPassword = data.password || this.generateSecurePassword();
      const hashedPassword = await this.hashPassword(tempPassword);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          firstName: data.firstName,
          lastName: data.lastName,
          hashedPassword,
          passwordSalt: crypto.randomBytes(32).toString('hex'),
          role: data.role as any,
          status: 'ACTIVE',
          emailVerified: true, // Admin users are pre-verified
          twoFactorEnabled: false, // Will be enforced on first login
        },
      });

      // Log admin user creation
      await this.logAccess({
        userId: data.createdBy,
        action: 'CREATE',
        resource: 'ADMIN_USER',
        resourceId: user.id,
        granted: true,
        ipAddress: '',
        timestamp: new Date(),
      });

      logger.info('Admin user created', {
        userId: user.id,
        email: data.email,
        role: data.role,
        createdBy: data.createdBy,
      });

      return {
        userId: user.id,
        tempPassword: data.password ? undefined : tempPassword,
      };

    } catch (error) {
      logger.error('Failed to create admin user', { email: data.email, error });
      throw new Error('Admin user creation failed');
    }
  }

  /**
   * Update admin user role or status
   */
  public async updateAdminUser(
    userId: string,
    updates: {
      role?: string;
      status?: 'ACTIVE' | 'SUSPENDED';
      ipRestrictions?: string[];
    },
    updatedBy: string
  ): Promise<void> {
    try {
      // Validate new role if provided
      if (updates.role) {
        const rolePermissions = await this.getRolePermissions(updates.role);
        if (rolePermissions.length === 0) {
          throw new Error('Invalid role');
        }
      }

      // Update user
      const updateData: any = {};
      if (updates.role) updateData.role = updates.role;
      if (updates.status) updateData.status = updates.status;

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Clear permission cache
      this.permissionCache.delete(`user_permissions_${userId}`);

      // Log update
      await this.logAccess({
        userId: updatedBy,
        action: 'UPDATE',
        resource: 'ADMIN_USER',
        resourceId: userId,
        granted: true,
        ipAddress: '',
        timestamp: new Date(),
      });

      logger.info('Admin user updated', {
        userId,
        updates,
        updatedBy,
      });

    } catch (error) {
      logger.error('Failed to update admin user', { userId, error });
      throw new Error('Admin user update failed');
    }
  }

  /**
   * Enforce 2FA for admin users
   */
  public async enforce2FA(userId: string): Promise<{
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      // Generate 2FA secret
      const secret = crypto.randomBytes(16).toString('base64');
      
      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Update user with 2FA data (encrypted)
      const encryptedSecret = this.encryptData(secret);
      const encryptedBackupCodes = backupCodes.map(code => this.encryptData(code));

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: encryptedSecret,
          backupCodes: JSON.stringify(encryptedBackupCodes),
          twoFactorEnabled: false, // Will be enabled after verification
        },
      });

      // Generate QR code URL
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const qrCodeUrl = this.generateQRCodeUrl(user!.email, secret);

      logger.info('2FA setup initiated', { userId });

      return { qrCodeUrl, backupCodes };

    } catch (error) {
      logger.error('Failed to enforce 2FA', { userId, error });
      throw new Error('2FA setup failed');
    }
  }

  /**
   * Get admin dashboard data
   */
  public async getDashboardData(userId: string): Promise<{
    summary: {
      activeUsers: number;
      pendingKYC: number;
      openAlerts: number;
      recentTransactions: number;
    };
    recentAlerts: Array<{
      id: string;
      type: string;
      severity: string;
      description: string;
      createdAt: Date;
    }>;
    systemHealth: {
      status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      uptime: number;
      lastBackup: Date;
      licenseStatus: 'VALID' | 'EXPIRING' | 'EXPIRED';
    };
  }> {
    try {
      // Check permissions
      const canView = await this.checkPermission(userId, 'READ', 'DASHBOARD');
      if (!canView.granted) {
        throw new Error('Access denied');
      }

      // Get summary data
      const [activeUsers, pendingKYC, openAlerts, recentTransactions] = await Promise.all([
        prisma.user.count({ where: { status: 'ACTIVE', role: 'PLAYER' } }),
        prisma.kycProfile.count({ where: { status: { in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'] } } }),
        prisma.complianceAlert.count({ where: { status: 'OPEN' } }),
        prisma.paymentTransaction.count({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        }),
      ]);

      // Get recent alerts
      const alerts = await prisma.complianceAlert.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          alertType: true,
          severity: true,
          description: true,
          createdAt: true,
        },
      });

      // System health check
      const systemHealth = await this.checkSystemHealth();

      return {
        summary: {
          activeUsers,
          pendingKYC,
          openAlerts,
          recentTransactions,
        },
        recentAlerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          description: alert.description,
          createdAt: alert.createdAt,
        })),
        systemHealth,
      };

    } catch (error) {
      logger.error('Failed to get dashboard data', { userId, error });
      throw new Error('Dashboard data retrieval failed');
    }
  }

  // Private helper methods...

  private getAllPermissions(): Permission[] {
    return [
      { action: '*', resource: '*' }, // Full access
    ];
  }

  private getCompliancePermissions(): Permission[] {
    return [
      { action: 'READ', resource: '*' },
      { action: 'CREATE', resource: 'COMPLIANCE_ALERT' },
      { action: 'UPDATE', resource: 'COMPLIANCE_ALERT' },
      { action: 'UPDATE', resource: 'KYC_PROFILE' },
      { action: 'CREATE', resource: 'SAR_REPORT' },
      { action: 'READ', resource: 'AML_SCREENING' },
      { action: 'UPDATE', resource: 'AML_SCREENING' },
    ];
  }

  private getRiskPermissions(): Permission[] {
    return [
      { action: 'READ', resource: 'TRANSACTION' },
      { action: 'READ', resource: 'USER' },
      { action: 'UPDATE', resource: 'RISK_PROFILE' },
      { action: 'CREATE', resource: 'RISK_ALERT' },
      { action: 'UPDATE', resource: 'USER_LIMITS' },
      { action: 'READ', resource: 'AUDIT_LOG' },
    ];
  }

  private getSupportPermissions(): Permission[] {
    return [
      { action: 'READ', resource: 'USER' },
      { action: 'UPDATE', resource: 'USER', conditions: { field: 'basic_info' } },
      { action: 'READ', resource: 'TRANSACTION' },
      { action: 'CREATE', resource: 'SUPPORT_TICKET' },
      { action: 'UPDATE', resource: 'SUPPORT_TICKET' },
    ];
  }

  private getFinancialPermissions(): Permission[] {
    return [
      { action: 'READ', resource: 'PAYMENT_TRANSACTION' },
      { action: 'UPDATE', resource: 'PAYMENT_TRANSACTION' },
      { action: 'CREATE', resource: 'FINANCIAL_REPORT' },
      { action: 'READ', resource: 'WALLET' },
      { action: 'UPDATE', resource: 'WALLET' },
    ];
  }

  private getAuditPermissions(): Permission[] {
    return [
      { action: 'READ', resource: 'AUDIT_LOG' },
      { action: 'READ', resource: 'COMPLIANCE_ALERT' },
      { action: 'READ', resource: 'SAR_REPORT' },
      { action: 'CREATE', resource: 'AUDIT_REPORT' },
    ];
  }

  private generateSecurePassword(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  private encryptData(data: string): string {
    const key = process.env.ADMIN_ENCRYPTION_KEY || 'default-key';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private generateQRCodeUrl(email: string, secret: string): string {
    const issuer = process.env.TOTP_ISSUER || 'Casino Platform';
    const otpUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpUrl)}`;
  }

  private async checkSystemHealth(): Promise<{
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    uptime: number;
    lastBackup: Date;
    licenseStatus: 'VALID' | 'EXPIRING' | 'EXPIRED';
  }> {
    // This would check actual system health metrics
    return {
      status: 'HEALTHY',
      uptime: process.uptime(),
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      licenseStatus: 'VALID',
    };
  }

  private async logAccess(log: AccessLog): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: log.userId,
          action: `ACCESS_${log.action}`,
          resource: log.resource,
          resourceId: log.resourceId,
          details: JSON.stringify({
            granted: log.granted,
            reason: log.reason,
          }),
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          outcome: log.granted ? 'SUCCESS' : 'DENIED',
        },
      });
    } catch (error) {
      logger.error('Failed to log access', { log, error });
    }
  }
}

// Export singleton instance
export const rbacManager = new RBACManager();
