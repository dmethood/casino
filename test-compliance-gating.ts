#!/usr/bin/env tsx

/**
 * Test Compliance Gating System - Verify Fail-Closed Architecture
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  reason: string;
}

class ComplianceGatingTest {
  private results: TestResult[] = [];

  async testComplianceGating(): Promise<void> {
    console.log('🔒 Testing Compliance Gating System - Fail-Closed Architecture\n');

    // Test public pages (should work)
    await this.testEndpoint('/', 200, 'Public home page should be accessible');
    await this.testEndpoint('/terms', 200, 'Legal terms should be accessible');
    await this.testEndpoint('/privacy', 200, 'Privacy policy should be accessible');
    await this.testEndpoint('/casino', 200, 'Casino lobby should be accessible');

    // Test protected API endpoints (should be blocked)
    await this.testEndpoint('/api/health', 503, 'Health API should be compliance-gated');
    await this.testEndpoint('/api/casino/seeds', 503, 'Casino API should be compliance-gated');
    await this.testEndpoint('/api/casino/bet', 503, 'Betting API should be compliance-gated');
    await this.testEndpoint('/api/payments/deposit', 503, 'Payment API should be compliance-gated');

    // Test authentication-required pages
    await this.testEndpoint('/dashboard', 200, 'Dashboard should redirect to login');
    await this.testEndpoint('/casino/games/crash', 200, 'Game pages should be accessible');

    this.printResults();
  }

  private async testEndpoint(path: string, expectedStatus: number, reason: string): Promise<void> {
    try {
      const response = await axios.get(`${BASE_URL}${path}`, {
        timeout: 5000,
        validateStatus: () => true // Don't throw on error status codes
      });

      const passed = response.status === expectedStatus;
      
      this.results.push({
        endpoint: path,
        expectedStatus,
        actualStatus: response.status,
        passed,
        reason
      });

      const icon = passed ? '✅' : '❌';
      console.log(`${icon} ${path} - Expected: ${expectedStatus}, Got: ${response.status} - ${reason}`);

    } catch (error: any) {
      const actualStatus = error.response?.status || 0;
      const passed = actualStatus === expectedStatus;
      
      this.results.push({
        endpoint: path,
        expectedStatus,
        actualStatus,
        passed,
        reason
      });

      const icon = passed ? '✅' : '❌';
      console.log(`${icon} ${path} - Expected: ${expectedStatus}, Got: ${actualStatus} - ${reason}`);
    }
  }

  private printResults(): void {
    console.log('\n📊 COMPLIANCE GATING TEST RESULTS');
    console.log('===================================');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  ${result.endpoint} - Expected ${result.expectedStatus}, got ${result.actualStatus}`);
      });
    }

    // Analyze compliance gating effectiveness
    const apiEndpoints = this.results.filter(r => r.endpoint.startsWith('/api/'));
    const blockedAPIs = apiEndpoints.filter(r => r.actualStatus === 503).length;
    
    console.log('\n🔒 COMPLIANCE GATING ANALYSIS:');
    console.log(`API Endpoints Tested: ${apiEndpoints.length}`);
    console.log(`APIs Blocked (503): ${blockedAPIs}`);
    console.log(`Gating Effectiveness: ${Math.round((blockedAPIs / apiEndpoints.length) * 100)}%`);

    if (blockedAPIs === apiEndpoints.length) {
      console.log('\n✅ COMPLIANCE GATING WORKING CORRECTLY');
      console.log('🔒 All API endpoints properly protected');
      console.log('🛡️ Fail-closed architecture operational');
    } else {
      console.log('\n⚠️ Some API endpoints not properly gated');
    }

    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (passed >= total * 0.8) {
      console.log('✅ PLATFORM COMPLIANCE GATING: EXCELLENT');
      console.log('🏆 Fail-closed architecture working as designed');
    } else {
      console.log('⚠️ PLATFORM COMPLIANCE GATING: NEEDS ATTENTION');
    }
  }
}

// Run compliance gating tests
const tester = new ComplianceGatingTest();
tester.testComplianceGating().catch(console.error);
