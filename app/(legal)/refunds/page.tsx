import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund Policy | Licensed Casino Platform',
  description: 'Our refund policy for deposits, withdrawals, and gaming transactions on our licensed casino platform.',
};

export default function RefundPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Refund Policy
            </h1>
            <p className="text-gray-600">Last updated: {lastUpdated}</p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 font-medium">
                💳 FINANCIAL PROTECTION: This policy outlines when refunds are available and our 
                process for handling refund requests in compliance with consumer protection laws.
              </p>
            </div>
          </header>

          <div className="space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Overview</h2>
              <p className="mb-4">
                This refund policy explains the circumstances under which refunds may be provided for 
                transactions on our licensed casino platform. As a regulated gambling operator, we follow 
                strict procedures to ensure fair treatment while maintaining the integrity of our services.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <p className="text-yellow-800 font-medium">
                  ⚠️ Important: Gambling involves risk, and losses incurred through normal gameplay 
                  are not eligible for refunds. This policy covers technical errors, system malfunctions, 
                  and other exceptional circumstances.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Eligible Refund Scenarios</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Technical System Errors</h3>
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-green-900 mb-2">Refunds Available For:</h4>
                <ul className="list-disc pl-6 text-green-800 space-y-1">
                  <li>Game software malfunctions affecting bet outcomes</li>
                  <li>Server errors resulting in lost bets or winnings</li>
                  <li>Payment processing errors (duplicate charges, incorrect amounts)</li>
                  <li>Platform downtime preventing game completion</li>
                  <li>Random Number Generator (RNG) failures verified by our systems</li>
                  <li>Incorrect game rule implementation affecting outcomes</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Account and Service Issues</h3>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Refunds May Be Available For:</h4>
                <ul className="list-disc pl-6 text-blue-800 space-y-1">
                  <li>Unauthorized account access with verified fraud</li>
                  <li>Deposits made during system-verified responsible gambling exclusions</li>
                  <li>Charges incurred due to our breach of terms and conditions</li>
                  <li>Services not delivered due to our error</li>
                  <li>Bonus terms and conditions incorrectly applied</li>
                  <li>Account closure disputes where we are found at fault</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Regulatory Compliance Refunds</h3>
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-purple-900 mb-2">Mandatory Refunds Include:</h4>
                <ul className="list-disc pl-6 text-purple-800 space-y-1">
                  <li>Services provided to underage users (full account refund)</li>
                  <li>Gambling activities in unlicensed jurisdictions</li>
                  <li>Operations during license suspension periods</li>
                  <li>Regulatory requirement compliance failures</li>
                  <li>Court-ordered refunds</li>
                  <li>Consumer protection violation remedies</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Non-Refundable Scenarios</h2>
              
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-red-900 mb-3">Refunds NOT Available For:</h3>
                <ul className="list-disc pl-6 text-red-800 space-y-2">
                  <li><strong>Normal Gaming Losses:</strong> Money lost through regular gameplay with functioning systems</li>
                  <li><strong>Poor Decision Making:</strong> Bets placed in error due to user mistake or misunderstanding</li>
                  <li><strong>Change of Mind:</strong> Wanting to cancel completed transactions or gameplay</li>
                  <li><strong>Unsuccessful Gambling Strategies:</strong> Losses from betting systems or strategies</li>
                  <li><strong>Market Fluctuations:</strong> Changes in odds or game conditions during normal operation</li>
                  <li><strong>Internet Connectivity:</strong> Issues with your internet connection during gameplay</li>
                  <li><strong>Device Problems:</strong> Hardware or software issues on your device</li>
                  <li><strong>Bonus Forfeitures:</strong> Bonuses lost due to terms violation or expiry</li>
                  <li><strong>Account Violations:</strong> Penalties for breaking our terms and conditions</li>
                  <li><strong>Voluntary Account Closure:</strong> Standard account closure without system error</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Deposit Refund Process</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 When Deposits May Be Refunded</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Payment processing errors (duplicate charges, wrong amounts)</li>
                <li>Deposits made after account closure requests</li>
                <li>Technical failures during deposit processing</li>
                <li>Deposits made during active self-exclusion periods</li>
                <li>Unauthorized transactions with verified fraud</li>
                <li>Compliance-related account restrictions</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Unused Deposit Balance</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>Account Closure Refunds:</strong> When you close your account, any unused deposit balance 
                  will be refunded to your original payment method after:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-1">
                  <li>Identity verification completion</li>
                  <li>AML compliance checks</li>
                  <li>Outstanding bet settlements</li>
                  <li>Bonus terms compliance verification</li>
                  <li>Any applicable processing fees deduction</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Game Malfunction Refunds</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">5.1 Definition of Game Malfunction</h3>
              <p className="mb-4">
                A game malfunction occurs when there is a failure of the electronic systems, software, 
                or hardware that affects the outcome of a game round in a way that would not have occurred 
                under normal operating conditions.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.2 Malfunction Investigation Process</h3>
              <div className="space-y-4">
                
                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-medium text-blue-900">Immediate Investigation</h4>
                    <p className="text-blue-800 text-sm">We review game logs, system records, and player reports within 24 hours.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-medium text-green-900">Technical Analysis</h4>
                    <p className="text-green-800 text-sm">Our technical team analyzes server logs, RNG data, and game state information.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-medium text-purple-900">External Verification</h4>
                    <p className="text-purple-800 text-sm">For significant malfunctions, independent testing labs may verify our findings.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-amber-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                  <div>
                    <h4 className="font-medium text-amber-900">Resolution & Refund</h4>
                    <p className="text-amber-800 text-sm">If malfunction is confirmed, we provide appropriate refunds and corrective measures.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Refund Request Process</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">6.1 How to Request a Refund</h3>
              <div className="bg-blue-50 p-6 rounded-lg mb-4">
                <h4 className="font-medium text-blue-900 mb-3">Contact Methods:</h4>
                <ul className="text-blue-800 space-y-2">
                  <li><strong>Email:</strong> <a href="mailto:refunds@casino.com" className="underline">refunds@casino.com</a></li>
                  <li><strong>Live Chat:</strong> Available 24/7 through your account</li>
                  <li><strong>Support Ticket:</strong> Through your account dashboard</li>
                  <li><strong>Phone:</strong> Customer support during business hours</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.2 Required Information</h3>
              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <p className="font-medium text-gray-900 mb-3">Please provide the following information:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Account username or email address</li>
                  <li>Transaction ID or bet reference number</li>
                  <li>Date and time of the incident</li>
                  <li>Detailed description of the issue</li>
                  <li>Amount involved and requested refund</li>
                  <li>Supporting evidence (screenshots, videos)</li>
                  <li>Any error messages received</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.3 Investigation Timeline</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border-b text-left">Stage</th>
                      <th className="px-4 py-2 border-b text-left">Timeframe</th>
                      <th className="px-4 py-2 border-b text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr>
                      <td className="px-4 py-2 border-b font-medium">Acknowledgment</td>
                      <td className="px-4 py-2 border-b">Within 24 hours</td>
                      <td className="px-4 py-2 border-b">Confirmation of refund request receipt</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b font-medium">Initial Review</td>
                      <td className="px-4 py-2 border-b">1-3 business days</td>
                      <td className="px-4 py-2 border-b">Basic eligibility assessment</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b font-medium">Investigation</td>
                      <td className="px-4 py-2 border-b">5-10 business days</td>
                      <td className="px-4 py-2 border-b">Detailed technical and compliance review</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b font-medium">Decision</td>
                      <td className="px-4 py-2 border-b">Within 15 business days</td>
                      <td className="px-4 py-2 border-b">Final determination and communication</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b font-medium">Processing</td>
                      <td className="px-4 py-2 border-b">3-7 business days</td>
                      <td className="px-4 py-2 border-b">Refund processing if approved</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Refund Processing Methods</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">7.1 Refund Methods</h3>
              <p className="mb-4">
                Refunds are processed using the same method as your original payment where possible:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">💳 Card Refunds</h4>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Refunded to original card used</li>
                    <li>• Processing time: 3-10 business days</li>
                    <li>• May appear as credit on statement</li>
                    <li>• Subject to card issuer policies</li>
                  </ul>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">🏦 Bank Transfer Refunds</h4>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Refunded to original bank account</li>
                    <li>• Processing time: 1-5 business days</li>
                    <li>• May require additional verification</li>
                    <li>• International transfers may take longer</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">7.2 Alternative Refund Methods</h3>
              <p className="mb-4">
                If refund to the original payment method is not possible due to technical or regulatory reasons:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Bank transfer to a verified account in your name</li>
                <li>Check payment (where legally permitted)</li>
                <li>Account credit (with your consent)</li>
                <li>Alternative electronic payment method</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Chargeback Policy</h2>
              
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-medium text-amber-900 mb-3">Chargeback Prevention</h3>
                <p className="text-amber-800 mb-3">
                  Before initiating a chargeback with your bank or card issuer, please contact us directly. 
                  We can often resolve issues faster and more efficiently than the chargeback process.
                </p>
                <p className="text-amber-700 text-sm">
                  Chargebacks can result in account restrictions and may be reported to credit agencies 
                  if found to be illegitimate.
                </p>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Chargeback Defense</h3>
              <p className="mb-4">
                We will defend against illegitimate chargebacks using:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Complete transaction records and audit trails</li>
                <li>Account activity logs and authentication records</li>
                <li>Game round data and outcomes verification</li>
                <li>Communication history with the customer</li>
                <li>Compliance documentation and regulatory permissions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Refund Limitations and Conditions</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">9.1 Time Limitations</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Game Issues:</strong> Must be reported within 30 days of occurrence</li>
                <li><strong>Payment Errors:</strong> Must be reported within 60 days of transaction</li>
                <li><strong>Account Issues:</strong> Must be reported within 90 days of discovery</li>
                <li><strong>Regulatory Issues:</strong> Subject to applicable statutory limitations</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">9.2 Refund Conditions</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Account must be in good standing (no terms violations)</li>
                <li>Identity verification must be completed</li>
                <li>AML and compliance checks must be satisfied</li>
                <li>All bonus conditions must be fulfilled or forfeited</li>
                <li>Outstanding bets must be settled</li>
                <li>Applicable fees and charges may be deducted</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">9.3 Maximum Refund Amounts</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="text-gray-700 space-y-1">
                  <li>• Individual transaction refunds: Up to original transaction amount</li>
                  <li>• Daily refund limit: Subject to internal risk management</li>
                  <li>• Monthly refund limit: May be applied based on account history</li>
                  <li>• Total account refund: Subject to regulatory and legal requirements</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Consumer Rights</h2>
              
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-medium text-green-900 mb-3">Your Consumer Rights</h3>
                <p className="text-green-800 mb-3">
                  Under consumer protection legislation, you may have additional rights beyond this policy:
                </p>
                <ul className="text-green-700 space-y-1">
                  <li>• Right to dispute resolution through ADR services</li>
                  <li>• Right to complaint to regulatory authorities</li>
                  <li>• Right to legal representation</li>
                  <li>• Right to cooling-off periods (where applicable)</li>
                  <li>• Right to data portability and deletion</li>
                </ul>
              </div>

              <p className="mb-4">
                This policy does not limit your statutory rights under consumer protection laws. 
                If you believe your consumer rights have been violated, you may contact:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Our complaints procedure (see <Link href="/complaints" className="text-blue-600 hover:underline">Complaints Policy</Link>)</li>
                <li>Independent dispute resolution services</li>
                <li>Consumer protection agencies in your jurisdiction</li>
                <li>Our regulatory authority</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Policy Updates and Changes</h2>
              <p className="mb-4">
                We may update this refund policy from time to time to reflect:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Changes in regulatory requirements</li>
                <li>Updates to payment processing capabilities</li>
                <li>Improvements to our refund procedures</li>
                <li>Consumer protection law changes</li>
                <li>Operational enhancements</li>
              </ul>
              <p className="mb-4">
                Material changes will be communicated via email and prominent notice on our platform 
                at least 30 days before taking effect.
              </p>
            </section>

            <section className="border-t pt-8">
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-md">
                <h3 className="font-semibold text-blue-900 mb-3">Contact Information for Refund Requests</h3>
                <div className="text-blue-800 space-y-2">
                  <p><strong>Refunds Department:</strong> <a href="mailto:refunds@casino.com" className="underline">refunds@casino.com</a></p>
                  <p><strong>Customer Support:</strong> <a href="mailto:support@casino.com" className="underline">support@casino.com</a></p>
                  <p><strong>Live Chat:</strong> Available 24/7 through your account</p>
                  <p><strong>Phone Support:</strong> Available during business hours</p>
                  <p><strong>Response Time:</strong> Within 24 hours for all refund inquiries</p>
                </div>
                <p className="text-blue-700 mt-4 font-medium">
                  For the fastest resolution, please provide all required information when making your refund request.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
