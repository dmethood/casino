/**
 * Privacy Policy - GDPR/UK GDPR Compliant
 * Licensed Casino Platform - Data Protection
 */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data Controller</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Licensed Casino Platform Ltd.</strong></p>
                <p>Malta Gaming Authority License: MGA/B2C/123/2024</p>
                <p>UK Gambling Commission License: 12345-6789-AB</p>
                <p>Address: Level 3, Spinola Park, Mikiel Ang Borg Street, St Julians SPK 1000, Malta</p>
                <p>Email: dpo@licensedcasino.com</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data We Collect</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Identity Information</h3>
                  <ul className="list-disc pl-6">
                    <li>Full name, date of birth, nationality</li>
                    <li>Government-issued ID documents</li>
                    <li>Proof of address documents</li>
                    <li>Selfie verification photos</li>
                    <li>Biometric data for liveness detection</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Financial Information</h3>
                  <ul className="list-disc pl-6">
                    <li>Tokenized payment method details</li>
                    <li>Transaction history and patterns</li>
                    <li>Source of funds documentation</li>
                    <li>Bank account information (for withdrawals)</li>
                    <li>Risk assessment scores</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Gaming Information</h3>
                <ul className="list-disc pl-6">
                  <li>Bet history and game results</li>
                  <li>Session duration and frequency</li>
                  <li>Responsible gambling settings and alerts</li>
                  <li>Win/loss statistics and patterns</li>
                  <li>Provably fair verification data</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Legal Basis for Processing</h2>
              <ul className="list-disc pl-6">
                <li><strong>Contract performance</strong>: Providing account services and gaming</li>
                <li><strong>Legal compliance</strong>: AML/KYC requirements and regulatory obligations</li>
                <li><strong>Legitimate interests</strong>: Fraud prevention and security</li>
                <li><strong>Consent</strong>: Marketing communications (where applicable)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
              <p>We share your data with authorized third parties only:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Payment processors (Stripe, Airwallex) for transaction processing</li>
                <li>KYC verification providers for identity confirmation</li>
                <li>AML screening services for compliance checks</li>
                <li>Regulatory authorities when legally required</li>
                <li>Law enforcement when legally obligated</li>
                <li>Professional advisors (legal, audit) under confidentiality</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <ul className="list-disc pl-6">
                  <li><strong>Account data</strong>: 5 years after account closure</li>
                  <li><strong>Transaction records</strong>: 5 years minimum (regulatory requirement)</li>
                  <li><strong>KYC documents</strong>: 5 years after verification</li>
                  <li><strong>Marketing data</strong>: Until consent withdrawn</li>
                  <li><strong>Audit logs</strong>: 7 years (tamper-evident)</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Your Rights (GDPR/UK GDPR)</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Data Subject Rights</h3>
                  <ul className="list-disc pl-6">
                    <li>Right to access your data</li>
                    <li>Right to rectification of inaccurate data</li>
                    <li>Right to erasure (with regulatory limitations)</li>
                    <li>Right to data portability</li>
                    <li>Right to object to processing</li>
                    <li>Right to withdraw consent</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Exercising Your Rights</h3>
                  <p className="text-sm">
                    To exercise your rights, contact our Data Protection Officer:
                  </p>
                  <div className="mt-2 text-sm">
                    <p>Email: dpo@licensedcasino.com</p>
                    <p>Response time: 30 days maximum</p>
                    <p>Identity verification required</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <ul className="list-disc pl-6">
                <li>AES-256 encryption for data at rest</li>
                <li>TLS 1.3 encryption for data in transit</li>
                <li>Regular security audits and penetration testing</li>
                <li>Staff access controls and background checks</li>
                <li>Incident response procedures and breach notification</li>
                <li>PCI DSS compliance for payment data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">International Transfers</h2>
              <p>
                Data may be transferred to countries with adequate protection or under appropriate 
                safeguards (Standard Contractual Clauses, adequacy decisions). Transfers are limited 
                to compliance and operational necessities only.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Data Protection</h3>
                  <p className="text-sm">
                    Data Protection Officer<br />
                    Email: dpo@licensedcasino.com<br />
                    Phone: +356 2138 0000
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Regulatory Complaints</h3>
                  <p className="text-sm">
                    Compliance Department<br />
                    Email: complaints@licensedcasino.com<br />
                    Phone: +356 2138 0001
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Supervisory Authority</h2>
              <p>
                You have the right to lodge a complaint with your local data protection authority:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>
                  <strong>Malta</strong>: Office of the Information and Data Protection Commissioner
                  <br />
                  <a href="https://idpc.org.mt" className="text-blue-600 hover:underline">
                    idpc.org.mt
                  </a>
                </li>
                <li>
                  <strong>UK</strong>: Information Commissioner's Office (ICO)
                  <br />
                  <a href="https://ico.org.uk" className="text-blue-600 hover:underline">
                    ico.org.uk
                  </a>
                </li>
              </ul>
            </section>

            <div className="mt-12 p-6 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Important Notice
              </h3>
              <p className="text-sm text-red-700">
                This platform operates real money gambling and is subject to strict regulatory 
                requirements. Data processing is necessary for legal compliance and cannot be 
                opted out of while maintaining an active account. Account closure may be 
                required if you withdraw consent for essential processing activities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}