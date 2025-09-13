'use client';

import { useState } from 'react';
import { AuthUser } from '@/lib/auth';
import Link from 'next/link';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  BellAlertIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface DashboardProps {
  user: AuthUser;
  dashboardData: any;
}

export default function AdminDashboard({ user, dashboardData }: DashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'compliance' | 'financial' | 'security'>('overview');
  const { summary, recentAlerts, systemHealth, licenseStatus, complianceMetrics, financialMetrics, securityEvents } = dashboardData;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'WARNING': return 'text-yellow-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'compliance', name: 'Compliance', icon: ShieldCheckIcon },
    { id: 'financial', name: 'Financial', icon: CurrencyDollarIcon },
    { id: 'security', name: 'Security', icon: BellAlertIcon },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header with user info and system status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome, {user.name}
            </h2>
            <p className="text-gray-600">Role: {user.role.replace('_', ' ')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${getStatusColor(systemHealth.status)}`}>
              {systemHealth.status === 'HEALTHY' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : systemHealth.status === 'WARNING' ? (
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              ) : (
                <XCircleIcon className="h-5 w-5 mr-2" />
              )}
              <span className="font-medium">System {systemHealth.status}</span>
            </div>
            <div className="text-gray-500 text-sm">
              Uptime: {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
            </div>
          </div>
        </div>
        
        {systemHealth.issues.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">System Issues</h3>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  {systemHealth.issues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.activeUsers.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">Total: </span>
              <span className="font-medium text-gray-900">{summary.totalUsers.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentCheckIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending KYC</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.pendingKYC.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/dashboard/kyc" className="text-blue-600 hover:text-blue-900">
                Review pending →
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BellAlertIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open Alerts</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.openAlerts.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/dashboard/alerts" className="text-red-600 hover:text-red-900">
                View alerts →
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Daily Deposits</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(summary.dailyDeposits)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">Withdrawals: </span>
              <span className="font-medium text-gray-900">{formatCurrency(summary.dailyWithdrawals)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {selectedTab === 'overview' && (
          <>
            {/* Recent Alerts */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Compliance Alerts</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {recentAlerts.length > 0 ? (
                  recentAlerts.slice(0, 10).map((alert: any) => (
                    <div key={alert.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                            <p className="text-sm text-gray-500">{alert.description}</p>
                            {alert.userName && (
                              <p className="text-xs text-gray-400">User: {alert.userName} ({alert.userEmail})</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{formatDate(alert.createdAt)}</p>
                          <p className="text-xs text-gray-400">{alert.type}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <BellAlertIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active alerts</h3>
                    <p className="mt-1 text-sm text-gray-500">System is operating normally.</p>
                  </div>
                )}
              </div>
              {recentAlerts.length > 10 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <Link href="/dashboard/alerts" className="text-blue-600 hover:text-blue-900 text-sm">
                    View all {recentAlerts.length} alerts →
                  </Link>
                </div>
              )}
            </div>

            {/* License Status */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">License Status</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {licenseStatus.map((license: any) => (
                    <div key={license.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{license.jurisdiction}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          license.daysUntilExpiry <= 30 ? 'bg-red-100 text-red-800' :
                          license.daysUntilExpiry <= 90 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {license.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>License:</strong> {license.licenseNumber}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Type:</strong> {license.licenseType}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Issuer:</strong> {license.issuer}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Expires:</strong> {formatDate(license.validUntil)}
                        <span className={`ml-2 ${
                          license.daysUntilExpiry <= 30 ? 'text-red-600' :
                          license.daysUntilExpiry <= 90 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          ({license.daysUntilExpiry} days)
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
                {licenseStatus.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active licenses</h3>
                    <p className="mt-1 text-sm text-gray-500">Configure licenses to enable platform operation.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedTab === 'compliance' && (
          <div className="space-y-6">
            
            {/* Compliance Metrics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Compliance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{complianceMetrics.kycApprovalRate}%</div>
                  <div className="text-sm text-gray-600">KYC Approval Rate</div>
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${complianceMetrics.kycApprovalRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{complianceMetrics.amlScreeningBacklog}</div>
                  <div className="text-sm text-gray-600">AML Screening Backlog</div>
                  <div className="mt-2">
                    <Link href="/dashboard/kyc" className="text-orange-600 hover:text-orange-800 text-xs">
                      Review backlog →
                    </Link>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{complianceMetrics.riskAlerts}</div>
                  <div className="text-sm text-gray-600">Active Risk Alerts</div>
                  <div className="mt-2">
                    <Link href="/dashboard/alerts" className="text-red-600 hover:text-red-800 text-xs">
                      View alerts →
                    </Link>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{complianceMetrics.sarReports}</div>
                  <div className="text-sm text-gray-600">SAR Reports (30d)</div>
                  <div className="mt-2">
                    <Link href="/dashboard/sar" className="text-purple-600 hover:text-purple-800 text-xs">
                      View reports →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  <Link href="/dashboard/kyc" className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <DocumentCheckIcon className="h-5 w-5 text-blue-500 mr-3" />
                      <div>
                        <p className="font-medium">Review KYC Applications</p>
                        <p className="text-sm text-gray-500">{summary.pendingKYC} pending reviews</p>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/dashboard/alerts" className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <BellAlertIcon className="h-5 w-5 text-red-500 mr-3" />
                      <div>
                        <p className="font-medium">Compliance Alerts</p>
                        <p className="text-sm text-gray-500">{summary.openAlerts} open alerts</p>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/dashboard/sar" className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <InformationCircleIcon className="h-5 w-5 text-purple-500 mr-3" />
                      <div>
                        <p className="font-medium">SAR Management</p>
                        <p className="text-sm text-gray-500">Suspicious activity reports</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">System Health</h4>
                <div className="space-y-4">
                  {Object.entries(systemHealth.checks).map(([check, status]) => (
                    <div key={check} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{check.replace('_', ' ')}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        status === 'HEALTHY' ? 'bg-green-100 text-green-800' :
                        status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {String(status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'financial' && (
          <div className="space-y-6">
            
            {/* Financial Overview */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Financial Overview (Last 30 Days)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(financialMetrics.totalDeposits)}</div>
                  <div className="text-sm text-gray-600">Total Deposits</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(financialMetrics.totalWithdrawals)}</div>
                  <div className="text-sm text-gray-600">Total Withdrawals</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(financialMetrics.netRevenue)}</div>
                  <div className="text-sm text-gray-600">Net Revenue</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(financialMetrics.averageDeposit)}</div>
                  <div className="text-sm text-gray-600">Average Deposit</div>
                </div>
              </div>
            </div>

            {/* Payment Metrics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Activity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">{formatCurrency(summary.dailyDeposits)}</div>
                  <div className="text-sm text-green-800">Deposits Today</div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">{formatCurrency(summary.dailyWithdrawals)}</div>
                  <div className="text-sm text-blue-800">Withdrawals Today</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-lg font-semibold text-purple-600">{summary.recentTransactions}</div>
                  <div className="text-sm text-purple-800">Transactions (24h)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'security' && (
          <div className="space-y-6">
            
            {/* Recent Security Events */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {securityEvents.length > 0 ? (
                  securityEvents.map((event: any) => (
                    <div key={event.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.riskScore > 70 ? 'bg-red-100 text-red-800' :
                            event.riskScore > 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            Risk: {event.riskScore || 'N/A'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{event.action.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">
                              User: {event.userEmail} ({event.userRole})
                            </p>
                            <p className="text-xs text-gray-400">IP: {event.ipAddress}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{formatDate(event.createdAt)}</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.outcome === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                            event.outcome === 'FAILURE' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {event.outcome}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No recent security events</h3>
                    <p className="mt-1 text-sm text-gray-500">System security is operating normally.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
