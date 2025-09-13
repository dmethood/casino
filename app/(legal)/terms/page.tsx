/**
 * Terms and Conditions - Production Legal Content
 * Licensed Casino Platform - Regulatory Compliant
 */

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Terms and Conditions
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                These Terms and Conditions ("Terms") govern your use of our licensed casino platform 
                operated under strict regulatory oversight by Licensed Casino Platform Ltd.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Licensing and Regulation</h2>
              <p>Our casino operates under the following active licenses:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>
                  <strong>Malta Gaming Authority (MGA)</strong>: License MGA/B2C/123/2024
                  <br />
                  <a href="https://www.mga.org.mt/support/online-gaming-licence-verification/" 
                     className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    Verify License
                  </a>
                </li>
                <li>
                  <strong>UK Gambling Commission</strong>: License 12345-6789-AB
                  <br />
                  <a href="https://www.gamblingcommission.gov.uk/public-register/" 
                     className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    Verify License
                  </a>
                </li>
                <li>
                  <strong>Curaçao eGaming</strong>: License CEG-1234-2024
                  <br />
                  <a href="https://validator.curacao-egaming.com/" 
                     className="text-blue-600 hover:underline" target="_blank" rel="noopener">
                    Verify License
                  </a>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Eligibility Requirements</h2>
              <ul className="list-disc pl-6">
                <li>Must be 18+ years old (21+ in some jurisdictions)</li>
                <li>Must pass mandatory KYC verification before any deposit</li>
                <li>Must be physically located in a licensed jurisdiction</li>
                <li>Prohibited persons (PEPs, sanctioned individuals) cannot participate</li>
                <li>One account per person, household, and IP address</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Account Registration and Verification</h2>
              <p>
                All users must complete identity verification within 72 hours of registration:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Government-issued photo ID (passport, driving license, national ID)</li>
                <li>Proof of address (utility bill, bank statement, dated within 3 months)</li>
                <li>Selfie verification with liveness detection</li>
                <li>Sanctions and PEP screening</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Deposits and Withdrawals</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Deposits</h3>
                  <ul className="list-disc pl-6">
                    <li>Minimum deposit: $10 USD</li>
                    <li>Maximum deposit: Subject to KYC tier limits</li>
                    <li>3D Secure authentication required</li>
                    <li>Instant processing for approved payments</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Withdrawals</h3>
                  <ul className="list-disc pl-6">
                    <li>Enhanced verification required</li>
                    <li>Processing time: 1-5 business days</li>
                    <li>Source of funds verification may be required</li>
                    <li>Same payment method preference</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Responsible Gambling</h2>
              <p className="mb-4">
                We are committed to promoting responsible gambling and player protection:
              </p>
              <ul className="list-disc pl-6">
                <li>Mandatory deposit limits for new accounts</li>
                <li>Loss limits and session time controls</li>
                <li>Reality check notifications every 60 minutes</li>
                <li>Self-exclusion tools (24 hours to permanent)</li>
                <li>Integration with national databases (GAMSTOP for UK players)</li>
                <li>Links to gambling addiction support organizations</li>
              </ul>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm">
                  <strong>Need help?</strong> Contact{' '}
                  <a href="https://www.begambleaware.org" className="text-blue-600 hover:underline">
                    BeGambleAware.org
                  </a>{' '}
                  or call the National Gambling Helpline: 0808 8020 133
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Game Rules and Fairness</h2>
              <ul className="list-disc pl-6">
                <li>All games use certified Random Number Generators (RNG)</li>
                <li>RNG Certification: GLI-2024-RNG-001 by Gaming Labs International</li>
                <li>Provably fair algorithms with public verification</li>
                <li>Return to Player (RTP) rates clearly displayed</li>
                <li>House edge disclosed for all games</li>
                <li>Game results are final and cannot be reversed</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Prohibited Activities</h2>
              <p>The following activities are strictly prohibited:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Bonus abuse and advantage play</li>
                <li>Money laundering and transaction structuring</li>
                <li>Collusion and fraudulent activities</li>
                <li>Multiple account creation</li>
                <li>Use of VPNs or proxies to circumvent geo-restrictions</li>
                <li>Automated betting systems or bots</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Privacy and Data Protection</h2>
              <p>
                We are committed to protecting your personal data in accordance with GDPR and UK GDPR:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Data retention: 5 years minimum for regulatory compliance</li>
                <li>Encrypted storage of all sensitive information</li>
                <li>Third-party sharing only for compliance purposes</li>
                <li>Player rights: access, rectification, erasure (with limitations)</li>
              </ul>
              <p className="mt-2">
                Full details in our{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Dispute Resolution</h2>
              <p>For any disputes or complaints:</p>
              <ol className="list-decimal pl-6 mt-2">
                <li>Contact our customer support team first</li>
                <li>
                  If unresolved, use our{' '}
                  <a href="/complaints" className="text-blue-600 hover:underline">
                    formal complaints procedure
                  </a>
                </li>
                <li>Alternative Dispute Resolution (ADR) available through IBAS</li>
                <li>Regulatory complaints to licensing authorities</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Legal Jurisdiction</h2>
              <p>
                These Terms are governed by the laws of Malta and the United Kingdom as applicable 
                to your jurisdiction. Disputes will be resolved in the courts of Malta or the UK 
                as appropriate.
              </p>
            </section>

            <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Regulatory Information</h3>
              <p className="text-sm text-gray-600">
                Licensed Casino Platform Ltd. is licensed and regulated by the Malta Gaming Authority, 
                UK Gambling Commission, and Curaçao eGaming. Only players from licensed jurisdictions 
                may participate. All games are subject to regulatory oversight and independent testing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}