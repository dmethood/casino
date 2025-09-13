'use client';

import { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/auth';
import { 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  InformationCircleIcon,
  BellAlertIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface ResponsibleGamblingToolsProps {
  user: AuthUser;
  rgProfile: any;
}

export default function ResponsibleGamblingTools({ user, rgProfile }: ResponsibleGamblingToolsProps) {
  const [activeTab, setActiveTab] = useState<'limits' | 'time' | 'exclusion' | 'session' | 'alerts'>('limits');
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [depositLimits, setDepositLimits] = useState({
    daily: rgProfile.dailyDepositLimit?.toString() || '',
    weekly: rgProfile.weeklyDepositLimit?.toString() || '',
    monthly: rgProfile.monthlyDepositLimit?.toString() || ''
  });

  const [lossLimits, setLossLimits] = useState({
    daily: rgProfile.dailyLossLimit?.toString() || '',
    weekly: rgProfile.weeklyLossLimit?.toString() || '',
    monthly: rgProfile.monthlyLossLimit?.toString() || ''
  });

  const [timeLimits, setTimeLimits] = useState({
    dailyTime: rgProfile.dailyTimeLimit?.toString() || '',
    sessionTime: rgProfile.sessionTimeLimit?.toString() || '',
    realityCheck: rgProfile.realityCheckInterval?.toString() || '60'
  });

  const jurisdiction = rgProfile.jurisdiction;
  const isMandatory = rgProfile.mandatory;
  const isHighCompliance = ['GB', 'MT'].includes(jurisdiction);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleLimitChange = async (type: 'deposit' | 'loss' | 'time', period: string, value: string) => {
    if (loading) return;

    const numValue = parseFloat(value || 0);
    const currentValue = type === 'deposit' ? 
      rgProfile[`${period}DepositLimit`] : 
      type === 'loss' ?
      rgProfile[`${period}LossLimit`] :
      rgProfile[`${period}TimeLimit`];

    // Check if this is an increase (requires cooling-off period)
    const isIncrease = numValue > (currentValue || 0);
    
    if (isIncrease && isHighCompliance) {
      setPendingAction({
        type: `${type}_limit`,
        period,
        value: numValue,
        currentValue: currentValue || 0,
        coolingOffHours: 24
      });
      setShowConfirmation('limit_increase');
      return;
    }

    // Immediate decrease or first-time setting
    await updateLimit(type, period, numValue);
  };

  const updateLimit = async (type: 'deposit' | 'loss' | 'time', period: string, value: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/responsible-gambling/limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          period,
          value,
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update limit');
      }

      const result = await response.json();
      
      // Update local state
      if (type === 'deposit') {
        setDepositLimits(prev => ({ ...prev, [period]: value.toString() }));
      } else if (type === 'loss') {
        setLossLimits(prev => ({ ...prev, [period]: value.toString() }));
      } else if (type === 'time') {
        setTimeLimits(prev => ({ ...prev, [period]: value.toString() }));
      }

      // Show success message
      alert(`${type} limit updated successfully${result.coolingOffUntil ? '. Changes will take effect after cooling-off period.' : '.'}`);

    } catch (error) {
      console.error('Error updating limit:', error);
      alert('Failed to update limit. Please try again.');
    } finally {
      setLoading(false);
      setShowConfirmation(null);
      setPendingAction(null);
    }
  };

  const handleSelfExclusion = async (type: string, duration: string) => {
    setPendingAction({ type: 'self_exclusion', exclusionType: type, duration });
    setShowConfirmation('self_exclusion');
  };

  const handleCoolingOff = async (duration: string) => {
    setPendingAction({ type: 'cooling_off', duration });
    setShowConfirmation('cooling_off');
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;

    setLoading(true);
    try {
      let endpoint = '';
      let body = {};

      switch (pendingAction.type) {
        case 'deposit_limit':
        case 'loss_limit':
        case 'time_limit':
          await updateLimit(pendingAction.type.split('_')[0], pendingAction.period, pendingAction.value);
          return;
        
        case 'self_exclusion':
          endpoint = '/api/responsible-gambling/self-exclusion';
          body = {
            type: pendingAction.exclusionType,
            duration: pendingAction.duration,
            userId: user.id
          };
          break;
        
        case 'cooling_off':
          endpoint = '/api/responsible-gambling/cooling-off';
          body = {
            duration: pendingAction.duration,
            userId: user.id
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to execute action');
      }

      const result = await response.json();
      
      if (pendingAction.type === 'self_exclusion' || pendingAction.type === 'cooling_off') {
        alert('Account restriction has been applied. You will be logged out.');
        window.location.href = '/';
      } else {
        alert('Action completed successfully.');
      }

    } catch (error) {
      console.error('Error executing action:', error);
      alert('Failed to complete action. Please contact support.');
    } finally {
      setLoading(false);
      setShowConfirmation(null);
      setPendingAction(null);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/responsible-gambling/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      // Refresh page to update alerts
      window.location.reload();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const tabs = [
    { id: 'limits', name: 'Deposit & Loss Limits', icon: CurrencyDollarIcon },
    { id: 'time', name: 'Time Controls', icon: ClockIcon },
    { id: 'exclusion', name: 'Self-Exclusion', icon: StopIcon },
    { id: 'session', name: 'Session History', icon: ChartBarIcon },
    { id: 'alerts', name: 'Alerts & Notifications', icon: BellAlertIcon },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Responsible Gambling Tools</h1>
            <p className="text-gray-600 mt-2">
              Manage your gambling limits and stay in control of your gaming activity.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              rgProfile.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              rgProfile.status === 'COOLING_OFF' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {rgProfile.status === 'ACTIVE' ? (
                <ShieldCheckIcon className="h-4 w-4 mr-1" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              )}
              Account {rgProfile.status.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Jurisdiction Information */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Jurisdiction:</strong> {jurisdiction} 
                {isMandatory && <span className="ml-2 font-semibold">(Mandatory limits apply)</span>}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Your responsible gambling tools are configured according to {jurisdiction} regulatory requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Active Restrictions */}
        {(rgProfile.coolingOffUntil || rgProfile.selfExcludedUntil) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Active Restrictions</h3>
                {rgProfile.coolingOffUntil && new Date(rgProfile.coolingOffUntil) > new Date() && (
                  <p className="text-sm text-red-700 mt-1">
                    Cooling-off period active until {new Date(rgProfile.coolingOffUntil).toLocaleString()}
                  </p>
                )}
                {rgProfile.selfExcludedUntil && new Date(rgProfile.selfExcludedUntil) > new Date() && (
                  <p className="text-sm text-red-700 mt-1">
                    Self-excluded until {new Date(rgProfile.selfExcludedUntil).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Unacknowledged Alerts */}
        {rgProfile.alerts.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <BellAlertIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Responsible Gambling Alerts</h3>
                <div className="mt-2 space-y-2">
                  {rgProfile.alerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between">
                      <p className="text-sm text-yellow-700">{alert.message}</p>
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-300"
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
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
        
        {activeTab === 'limits' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Deposit Limits */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Deposit Limits</h3>
              <p className="text-sm text-gray-600 mb-6">
                Set limits on how much you can deposit into your account.
                {isHighCompliance && " Increases require a 24-hour cooling-off period."}
              </p>
              
              <div className="space-y-4">
                {['daily', 'weekly', 'monthly'].map((period) => (
                  <div key={period}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {period.charAt(0).toUpperCase() + period.slice(1)} Limit
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={depositLimits[period as keyof typeof depositLimits]}
                          onChange={(e) => setDepositLimits(prev => ({ ...prev, [period]: e.target.value }))}
                          placeholder="No limit set"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="10"
                          disabled={loading}
                        />
                      </div>
                      <button
                        onClick={() => handleLimitChange('deposit', period, depositLimits[period as keyof typeof depositLimits])}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        Update
                      </button>
                    </div>
                    {rgProfile[`${period}DepositLimit`] && (
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {formatCurrency(rgProfile[`${period}DepositLimit`])}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {isMandatory && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-700">
                    Your jurisdiction requires deposit limits. Contact support if you need assistance.
                  </p>
                </div>
              )}
            </div>

            {/* Loss Limits */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Loss Limits</h3>
              <p className="text-sm text-gray-600 mb-6">
                Set limits on how much you can lose over different time periods.
                {isHighCompliance && " Increases require a 24-hour cooling-off period."}
              </p>
              
              <div className="space-y-4">
                {['daily', 'weekly', 'monthly'].map((period) => (
                  <div key={period}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {period.charAt(0).toUpperCase() + period.slice(1)} Loss Limit
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={lossLimits[period as keyof typeof lossLimits]}
                          onChange={(e) => setLossLimits(prev => ({ ...prev, [period]: e.target.value }))}
                          placeholder="No limit set"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="10"
                          disabled={loading}
                        />
                      </div>
                      <button
                        onClick={() => handleLimitChange('loss', period, lossLimits[period as keyof typeof lossLimits])}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        Update
                      </button>
                    </div>
                    {rgProfile[`${period}LossLimit`] && (
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {formatCurrency(rgProfile[`${period}LossLimit`])}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Time Limits */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Time Controls</h3>
              <p className="text-sm text-gray-600 mb-6">
                Manage how long you can spend gambling each day or per session.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Time Limit (minutes)
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={timeLimits.dailyTime}
                        onChange={(e) => setTimeLimits(prev => ({ ...prev, dailyTime: e.target.value }))}
                        placeholder="No limit set"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="30"
                        disabled={loading}
                      />
                    </div>
                    <button
                      onClick={() => handleLimitChange('time', 'dailyTime', timeLimits.dailyTime)}
                      disabled={loading}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                  {rgProfile.dailyTimeLimit && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {formatDuration(rgProfile.dailyTimeLimit)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Time Limit (minutes)
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={timeLimits.sessionTime}
                        onChange={(e) => setTimeLimits(prev => ({ ...prev, sessionTime: e.target.value }))}
                        placeholder="No limit set"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="30"
                        disabled={loading}
                      />
                    </div>
                    <button
                      onClick={() => handleLimitChange('time', 'sessionTime', timeLimits.sessionTime)}
                      disabled={loading}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                  {rgProfile.sessionTimeLimit && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {formatDuration(rgProfile.sessionTimeLimit)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reality Check Interval (minutes)
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={timeLimits.realityCheck}
                        onChange={(e) => setTimeLimits(prev => ({ ...prev, realityCheck: e.target.value }))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        min={jurisdiction === 'GB' ? '60' : '30'}
                        max="180"
                        step="30"
                        disabled={loading || jurisdiction === 'GB'} // UKGC requires hourly
                      />
                    </div>
                    <button
                      onClick={() => handleLimitChange('time', 'realityCheck', timeLimits.realityCheck)}
                      disabled={loading || jurisdiction === 'GB'}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {formatDuration(rgProfile.realityCheckInterval)}
                    {jurisdiction === 'GB' && " (Fixed by UKGC regulation)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Current Session */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Session</h3>
              <p className="text-sm text-gray-600 mb-6">
                Your current gambling session information.
              </p>
              
              {rgProfile.sessions && rgProfile.sessions[0] && !rgProfile.sessions[0].endedAt ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Session started:</span>
                    <span className="text-sm font-medium">
                      {new Date(rgProfile.sessions[0].startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="text-sm font-medium">
                      {Math.floor((Date.now() - new Date(rgProfile.sessions[0].startedAt).getTime()) / 60000)} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total staked:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(rgProfile.sessions[0].totalStaked)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Net result:</span>
                    <span className={`text-sm font-medium ${
                      rgProfile.sessions[0].netResult >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(rgProfile.sessions[0].netResult)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No active session</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'exclusion' && (
          <div className="space-y-6">
            
            {/* Cooling-off Periods */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cooling-off Periods</h3>
              <p className="text-sm text-gray-600 mb-6">
                Take a short break from gambling. You can return to your account after the cooling-off period ends.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['24H', '48H', '7D'].map((duration) => (
                  <button
                    key={duration}
                    onClick={() => handleCoolingOff(duration)}
                    disabled={loading || rgProfile.status !== 'ACTIVE'}
                    className="bg-yellow-600 text-white px-4 py-3 rounded-md hover:bg-yellow-700 disabled:opacity-50 text-center"
                  >
                    {duration === '24H' ? '24 Hours' :
                     duration === '48H' ? '48 Hours' : '7 Days'}
                  </button>
                ))}
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      During cooling-off periods, you cannot gamble, deposit, or change your limits. 
                      You can still withdraw funds and access customer support.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Self-Exclusion */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Self-Exclusion</h3>
              <p className="text-sm text-gray-600 mb-6">
                Completely exclude yourself from gambling for a longer period. This action cannot be reversed 
                until the exclusion period ends.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: '1M', label: '1 Month', severity: 'medium' },
                  { key: '3M', label: '3 Months', severity: 'high' },
                  { key: '6M', label: '6 Months', severity: 'high' },
                  { key: 'PERMANENT', label: 'Permanent', severity: 'critical' }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleSelfExclusion('SELF_EXCLUSION', option.key)}
                    disabled={loading || rgProfile.status !== 'ACTIVE'}
                    className={`px-4 py-3 rounded-md text-white text-center disabled:opacity-50 ${
                      option.severity === 'medium' ? 'bg-orange-600 hover:bg-orange-700' :
                      option.severity === 'high' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-red-800 hover:bg-red-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <StopIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">Warning</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Self-exclusion cannot be reversed once activated. You will not be able to gamble, 
                      deposit, or access gaming features until the exclusion period ends.
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-operator self-exclusion info */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">Multi-Operator Exclusion</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      For comprehensive protection, consider registering with GAMSTOP (UK) or your local 
                      self-exclusion database to exclude from all licensed operators.
                    </p>
                    <div className="mt-2">
                      <a 
                        href="https://www.gamstop.co.uk" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Visit GAMSTOP →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'session' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Session History</h3>
            <p className="text-sm text-gray-600 mb-6">
              Review your recent gambling sessions and activity patterns.
            </p>
            
            {rgProfile.sessions && rgProfile.sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Staked
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Games Played
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rgProfile.sessions.map((session: any) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(session.startedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.duration ? formatDuration(session.duration) : 
                           session.endedAt ? formatDuration(Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)) :
                           'Active'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(session.totalStaked)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          session.netResult >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(session.netResult)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.gamesPlayed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No session history</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your gambling sessions will appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alerts & Notifications</h3>
            <p className="text-sm text-gray-600 mb-6">
              Responsible gambling alerts and system notifications.
            </p>
            
            {rgProfile.alerts && rgProfile.alerts.length > 0 ? (
              <div className="space-y-4">
                {rgProfile.alerts.map((alert: any) => (
                  <div key={alert.id} className={`p-4 rounded-md border ${
                    alert.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                    alert.severity === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                    alert.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {alert.alertType.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BellAlertIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Responsible gambling alerts will appear here.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Confirmation Modals */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {showConfirmation === 'limit_increase' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="text-lg font-medium text-gray-900">Limit Increase Confirmation</h3>
                    <div className="mt-2 px-7 py-3">
                      <p className="text-sm text-gray-500">
                        You are increasing your {pendingAction?.type.replace('_', ' ')} {pendingAction?.period} limit 
                        from {formatCurrency(pendingAction?.currentValue || 0)} to {formatCurrency(pendingAction?.value || 0)}.
                      </p>
                      <p className="text-sm text-yellow-600 mt-2 font-medium">
                        This change requires a {pendingAction?.coolingOffHours}-hour cooling-off period before taking effect.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {showConfirmation === 'cooling_off' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="text-lg font-medium text-gray-900">Cooling-off Confirmation</h3>
                    <div className="mt-2 px-7 py-3">
                      <p className="text-sm text-gray-500">
                        You will be unable to gamble or deposit for {
                          pendingAction?.duration === '24H' ? '24 hours' :
                          pendingAction?.duration === '48H' ? '48 hours' : '7 days'
                        }.
                      </p>
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        You will be logged out immediately.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {showConfirmation === 'self_exclusion' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <StopIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="text-lg font-medium text-gray-900">Self-Exclusion Confirmation</h3>
                    <div className="mt-2 px-7 py-3">
                      <p className="text-sm text-gray-500">
                        You will be completely excluded from gambling for {
                          pendingAction?.duration === '1M' ? '1 month' :
                          pendingAction?.duration === '3M' ? '3 months' :
                          pendingAction?.duration === '6M' ? '6 months' : 'permanently'
                        }.
                      </p>
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        This action cannot be reversed. You will be logged out immediately.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={executePendingAction}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex-1"
                  >
                    {loading ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmation(null);
                      setPendingAction(null);
                    }}
                    disabled={loading}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
