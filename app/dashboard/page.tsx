import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { rbacManager } from '@/lib/admin/rbac';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Licensed Casino Platform',
  description: 'Administration dashboard for licensed casino platform management',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role === 'PLAYER') {
    redirect('/signin');
  }

  // Check dashboard access permission
  const canAccess = await rbacManager.checkPermission(
    session.user.id,
    'READ',
    'DASHBOARD'
  );

  if (!canAccess.granted) {
    redirect('/unauthorized');
  }

  // Fetch dashboard data
  const dashboardData = await getDashboardData(session.user.id);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Licensed Casino Platform - Compliance Management System
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-700">System Operational</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-700">Compliance Active</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-700">Monitoring Enabled</span>
            </div>
          </div>
        </div>

        <AdminDashboard 
          user={session.user}
          dashboardData={dashboardData}
        />
      </div>
    </div>
  );
}

async function getDashboardData(userId: string) {
  try {
    // Get key metrics
    const [
      totalUsers,
      activeUsers,
      pendingKYC,
      openAlerts,
      recentTransactions,
      totalDeposits,
      totalWithdrawals,
      activeLicenses,
      recentAlerts,
      systemHealth
    ] = await Promise.all([
      // Total registered users
      prisma.user.count({
        where: { role: 'PLAYER' }
      }),
      
      // Active users (logged in within 30 days)
      prisma.user.count({
        where: {
          role: 'PLAYER',
          status: 'ACTIVE',
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Pending KYC verifications
      prisma.kycProfile.count({
        where: {
          status: {
            in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED']
          }
        }
      }),
      
      // Open compliance alerts
      prisma.complianceAlert.count({
        where: { status: 'OPEN' }
      }),
      
      // Recent transactions (last 24 hours)
      prisma.paymentTransaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total deposits today
      prisma.paymentTransaction.aggregate({
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { amount: true }
      }),
      
      // Total withdrawals today
      prisma.paymentTransaction.aggregate({
        where: {
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { amount: true }
      }),
      
      // Active licenses
      prisma.license.count({
        where: {
          status: 'ACTIVE',
          validUntil: { gt: new Date() }
        }
      }),
      
      // Recent alerts for quick overview
      prisma.complianceAlert.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      
      // System health indicators
      getSystemHealth()
    ]);

    return {
      summary: {
        totalUsers,
        activeUsers,
        pendingKYC,
        openAlerts,
        recentTransactions,
        dailyDeposits: totalDeposits._sum.amount || 0,
        dailyWithdrawals: totalWithdrawals._sum.amount || 0,
        activeLicenses
      },
      recentAlerts: recentAlerts.map(alert => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        userId: alert.userId,
        userName: alert.user ? `${alert.user.firstName} ${alert.user.lastName}` : null,
        userEmail: alert.user?.email || null,
        createdAt: alert.createdAt,
        status: alert.status
      })),
      systemHealth,
      licenseStatus: await getLicenseStatus(),
      complianceMetrics: await getComplianceMetrics(),
      financialMetrics: await getFinancialMetrics(),
      securityEvents: await getRecentSecurityEvents()
    };

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return {
      summary: {
        totalUsers: 0,
        activeUsers: 0,
        pendingKYC: 0,
        openAlerts: 0,
        recentTransactions: 0,
        dailyDeposits: 0,
        dailyWithdrawals: 0,
        activeLicenses: 0
      },
      recentAlerts: [],
      systemHealth: { status: 'UNKNOWN' as const, issues: ['Dashboard data unavailable'] },
      licenseStatus: [],
      complianceMetrics: {
        kycApprovalRate: 0,
        amlScreeningBacklog: 0,
        riskAlerts: 0,
        sarReports: 0
      },
      financialMetrics: {
        totalDeposits: 0,
        totalWithdrawals: 0,
        netRevenue: 0,
        averageDeposit: 0
      },
      securityEvents: []
    };
  }
}

async function getSystemHealth() {
  const issues: string[] = [];
  
  // Check license expiry
  const expiringLicenses = await prisma.license.count({
    where: {
      status: 'ACTIVE',
      validUntil: {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    }
  });
  
  if (expiringLicenses > 0) {
    issues.push(`${expiringLicenses} license(s) expiring within 30 days`);
  }
  
  // Check KYC backlog
  const kycBacklog = await prisma.kycProfile.count({
    where: {
      status: 'UNDER_REVIEW',
      createdAt: {
        lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days
      }
    }
  });
  
  if (kycBacklog > 10) {
    issues.push(`KYC review backlog: ${kycBacklog} profiles`);
  }
  
  // Check high-severity alerts
  const criticalAlerts = await prisma.complianceAlert.count({
    where: {
      status: 'OPEN',
      severity: 'CRITICAL'
    }
  });
  
  if (criticalAlerts > 0) {
    issues.push(`${criticalAlerts} critical alert(s) open`);
  }
  
  return {
    status: issues.length === 0 ? 'HEALTHY' as const : 
            issues.length <= 2 ? 'WARNING' as const : 'CRITICAL' as const,
    issues,
    uptime: Math.floor(process.uptime()),
    lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000), // Mock - would be real backup time
    checks: {
      database: 'HEALTHY',
      payments: 'HEALTHY',
      kyc: kycBacklog > 10 ? 'WARNING' : 'HEALTHY',
      licenses: expiringLicenses > 0 ? 'WARNING' : 'HEALTHY'
    }
  };
}

async function getLicenseStatus() {
  const licenses = await prisma.license.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { validUntil: 'asc' }
  });
  
  return licenses.map(license => ({
    id: license.id,
    jurisdiction: license.jurisdiction,
    licenseNumber: license.licenseNumber,
    licenseType: license.licenseType,
    issuer: license.issuer,
    validUntil: license.validUntil,
    daysUntilExpiry: Math.ceil((license.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    status: license.status
  }));
}

async function getComplianceMetrics() {
  const [
    totalKycProfiles,
    approvedKycProfiles,
    amlScreeningBacklog,
    riskAlerts,
    sarReports
  ] = await Promise.all([
    prisma.kycProfile.count(),
    prisma.kycProfile.count({ where: { approved: true } }),
    prisma.kycProfile.count({
      where: {
        lastScreened: {
          lte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      }
    }),
    prisma.complianceAlert.count({
      where: {
        alertType: { in: ['AML_MATCH', 'LARGE_TRANSACTION', 'VELOCITY_ALERT'] },
        status: 'OPEN'
      }
    }),
    prisma.sarReport.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
  ]);
  
  return {
    kycApprovalRate: totalKycProfiles > 0 ? Math.round((approvedKycProfiles / totalKycProfiles) * 100) : 0,
    amlScreeningBacklog,
    riskAlerts,
    sarReports
  };
}

async function getFinancialMetrics() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [depositSum, withdrawalSum, depositCount] = await Promise.all([
    prisma.paymentTransaction.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { amount: true }
    }),
    prisma.paymentTransaction.aggregate({
      where: {
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { amount: true }
    }),
    prisma.paymentTransaction.count({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo }
      }
    })
  ]);
  
  const totalDeposits = depositSum._sum.amount || 0;
  const totalWithdrawals = withdrawalSum._sum.amount || 0;
  
  return {
    totalDeposits: (totalDeposits as any) || 0,
    totalWithdrawals: (totalWithdrawals as any) || 0,
    netRevenue: ((totalDeposits as any) || 0) - ((totalWithdrawals as any) || 0),
    averageDeposit: depositCount > 0 ? ((totalDeposits as any) || 0) / depositCount : 0
  };
}

async function getRecentSecurityEvents() {
  // Get recent audit logs for security events
  const securityEvents = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'KYC_REJECTED']
      },
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });
  
  return securityEvents.map(event => ({
    id: event.id,
    action: event.action,
    userId: event.userId,
    userEmail: event.user?.email || 'Unknown',
    userRole: event.user?.role || 'Unknown',
    ipAddress: event.ipAddress,
    outcome: event.outcome,
    createdAt: event.createdAt,
    riskScore: event.riskScore
  }));
}