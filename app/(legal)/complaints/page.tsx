import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Complaints and Dispute Resolution | Licensed Casino Platform',
  description: 'How to file complaints and resolve disputes with our licensed casino platform.',
};

export default function ComplaintsPage() {
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
              Complaints and Dispute Resolution
            </h1>
            <p className="text-gray-600">Last updated: {lastUpdated}</p>
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">
                ⚖️ FAIR RESOLUTION: We are committed to resolving all disputes fairly and transparently, 
                with independent dispute resolution available if needed.
              </p>
            </div>
          </header>

          <div className="space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Our Commitment to Fair Resolution</h2>
              <p className="mb-4">
                We strive to provide excellent customer service and resolve any issues quickly and fairly. 
                If you have a complaint or dispute, we are committed to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Acknowledging your complaint within 24 hours</li>
                <li>Investigating all issues thoroughly and objectively</li>
                <li>Providing regular updates on the progress</li>
                <li>Resolving complaints within our target timeframes</li>
                <li>Offering multiple escalation paths including independent dispute resolution</li>
                <li>Implementing improvements based on feedback received</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Step 1: Contact Customer Support</h2>
              <p className="mb-4">
                Most issues can be resolved quickly through our customer support team. 
                Please try this first before escalating to formal complaints procedures.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Contact Methods:</h3>
                <div className="grid md:grid-cols-2 gap-4 text-blue-800">
                  <div>
                    <h4 className="font-medium mb-2">📧 Email Support</h4>
                    <p>Email: <a href="mailto:support@casino.com" className="underline">support@casino.com</a></p>
                    <p>Response time: Within 4 hours</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">💬 Live Chat</h4>
                    <p>Available: 24/7</p>
                    <p>Average response: Under 2 minutes</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">📞 Phone Support</h4>
                    <p>Available: 9 AM - 11 PM GMT</p>
                    <p>Phone: +44 [PHONE NUMBER]</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">🎫 Support Ticket</h4>
                    <p>Through your account dashboard</p>
                    <p>Response time: Within 2 hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">Tips for Faster Resolution:</h4>
                <ul className="text-yellow-700 space-y-1">
                  <li>• Provide your account username or email</li>
                  <li>• Include relevant transaction IDs or bet IDs</li>
                  <li>• Describe the issue clearly with specific details</li>
                  <li>• Attach any supporting screenshots or documents</li>
                  <li>• Specify your preferred resolution if applicable</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Step 2: Formal Complaint Process</h2>
              <p className="mb-4">
                If your issue is not resolved through customer support within 5 business days, 
                or if you are not satisfied with the resolution, you can escalate to our formal complaints procedure.
              </p>

              <div className="space-y-6">
                <div className="border-l-4 border-red-400 pl-4">
                  <h3 className="text-lg font-medium text-red-900">Formal Complaint Submission</h3>
                  <p className="text-red-800 mb-2">
                    Email: <a href="mailto:complaints@casino.com" className="underline">complaints@casino.com</a>
                  </p>
                  <p className="text-red-700 text-sm">
                    Include "FORMAL COMPLAINT" in the subject line and reference any previous support ticket numbers.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Required Information:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Full name and account details</li>
                    <li>Detailed description of the complaint</li>
                    <li>Timeline of events and previous communications</li>
                    <li>Supporting evidence (screenshots, transaction records, etc.)</li>
                    <li>Desired resolution or outcome</li>
                    <li>Previous customer support ticket references</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Complaint Investigation Process</h2>
              <div className="space-y-4">
                
                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="font-medium text-blue-900">Acknowledgment (Within 24 hours)</h3>
                    <p className="text-blue-800 text-sm">We acknowledge receipt of your formal complaint and assign a unique reference number.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="font-medium text-green-900">Investigation (5-10 business days)</h3>
                    <p className="text-green-800 text-sm">Our complaints team conducts a thorough investigation, reviewing all relevant records and evidence.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="font-medium text-purple-900">Review & Decision (Within 15 business days)</h3>
                    <p className="text-purple-800 text-sm">Senior management reviews the investigation findings and makes a final decision.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-amber-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                  <div>
                    <h3 className="font-medium text-amber-900">Resolution Communication</h3>
                    <p className="text-amber-800 text-sm">We provide a detailed written response explaining our decision and any remedial action taken.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Types of Complaints We Handle</h2>
              <div className="grid md:grid-cols-2 gap-6">
                
                <div className="border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">🎮 Gaming Disputes</h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Game malfunction or technical issues</li>
                    <li>• Disputed game outcomes</li>
                    <li>• Missing winnings or incorrect payouts</li>
                    <li>• Bonus terms and conditions disputes</li>
                    <li>• RTP (Return to Player) concerns</li>
                  </ul>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">💳 Payment Issues</h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Failed or delayed deposits</li>
                    <li>• Withdrawal processing delays</li>
                    <li>• Incorrect charges or fees</li>
                    <li>• Payment method restrictions</li>
                    <li>• Chargeback disputes</li>
                  </ul>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">👤 Account Management</h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Account closure or suspension</li>
                    <li>• KYC verification issues</li>
                    <li>• Responsible gambling tool problems</li>
                    <li>• Account security concerns</li>
                    <li>• Data protection and privacy</li>
                  </ul>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">🛡️ Service Quality</h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Customer service experiences</li>
                    <li>• Website or app functionality</li>
                    <li>• Marketing and communication issues</li>
                    <li>• Terms and conditions disputes</li>
                    <li>• Regulatory compliance concerns</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Step 3: Independent Dispute Resolution</h2>
              <p className="mb-4">
                If you are not satisfied with our formal complaint resolution, you have the right to 
                escalate your dispute to independent third-party resolution services.
              </p>

              <div className="space-y-6">
                
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">Alternative Dispute Resolution (ADR)</h3>
                  <div className="text-blue-800">
                    <p className="mb-2"><strong>[ADR PROVIDER NAME]</strong></p>
                    <p>Website: <a href="[ADR_WEBSITE]" className="underline">[ADR_WEBSITE]</a></p>
                    <p>Email: <a href="mailto:[ADR_EMAIL]" className="underline">[ADR_EMAIL]</a></p>
                    <p className="text-sm mt-2">
                      Our ADR provider offers free, impartial dispute resolution services for gambling-related complaints.
                      Decisions are binding on us but not on you.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">ADR Process Requirements:</h4>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                    <li>You must first complete our internal complaints process</li>
                    <li>The dispute must be submitted within 6 months of our final response</li>
                    <li>The complaint must be about actions within the last 6 years</li>
                    <li>You must provide all relevant documentation and evidence</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Step 4: Regulatory Authority</h2>
              <p className="mb-4">
                As a final resort, you may refer your complaint to our licensing authority:
              </p>

              <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-red-900 mb-3">Regulatory Authority</h3>
                <div className="text-red-800 space-y-2">
                  <p><strong>[REGULATORY AUTHORITY NAME]</strong></p>
                  <p>License Number: <span className="font-mono">[LICENSE_NUMBER]</span></p>
                  <p>Website: <a href="[REGULATOR_WEBSITE]" className="underline">[REGULATOR_WEBSITE]</a></p>
                  <p>Complaints Page: <a href="[REGULATOR_COMPLAINTS_URL]" className="underline">[REGULATOR_COMPLAINTS_URL]</a></p>
                  <p>Email: <a href="mailto:[REGULATOR_EMAIL]" className="underline">[REGULATOR_EMAIL]</a></p>
                </div>
                <p className="text-red-700 text-sm mt-3">
                  Note: Regulatory authorities typically require completion of ADR processes before accepting complaints.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Complaint Outcomes and Remedies</h2>
              <p className="mb-4">Depending on the nature and validity of your complaint, potential outcomes may include:</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Financial Remedies</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                    <li>Refund of stakes or deposits</li>
                    <li>Payment of disputed winnings</li>
                    <li>Compensation for losses caused by our error</li>
                    <li>Reversal of incorrect charges</li>
                    <li>Goodwill gestures or bonus credits</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Non-Financial Remedies</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
                    <li>Formal apology and explanation</li>
                    <li>Account restoration or limit adjustments</li>
                    <li>Process improvements and policy changes</li>
                    <li>Staff training and system updates</li>
                    <li>Enhanced customer service procedures</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Learning from Complaints</h2>
              <p className="mb-4">
                We view complaints as valuable feedback that helps us improve our services. We:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Analyze complaint patterns and root causes</li>
                <li>Implement systematic improvements to prevent recurring issues</li>
                <li>Update policies and procedures based on feedback</li>
                <li>Provide additional staff training where needed</li>
                <li>Report complaint trends to senior management</li>
                <li>Share learnings across our organization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Your Rights During the Process</h2>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-medium text-green-900 mb-3">Throughout the complaints process, you have the right to:</h3>
                <ul className="text-green-800 space-y-2">
                  <li>✓ Be treated with respect and courtesy</li>
                  <li>✓ Receive regular updates on your complaint's progress</li>
                  <li>✓ Have your complaint investigated fairly and objectively</li>
                  <li>✓ Provide additional information or evidence</li>
                  <li>✓ Continue using our services during the investigation (unless suspended for other reasons)</li>
                  <li>✓ Escalate to independent dispute resolution</li>
                  <li>✓ Receive a detailed written response explaining our decision</li>
                  <li>✓ Request a review of the decision if new evidence emerges</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Time Limits and Deadlines</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border-b text-left">Stage</th>
                      <th className="px-4 py-2 border-b text-left">Our Timeframe</th>
                      <th className="px-4 py-2 border-b text-left">Your Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr>
                      <td className="px-4 py-2 border-b">Customer Support Response</td>
                      <td className="px-4 py-2 border-b">Within 4 hours</td>
                      <td className="px-4 py-2 border-b">No limit</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">Formal Complaint Acknowledgment</td>
                      <td className="px-4 py-2 border-b">Within 24 hours</td>
                      <td className="px-4 py-2 border-b">Within 90 days of issue</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">Investigation & Response</td>
                      <td className="px-4 py-2 border-b">Within 15 business days</td>
                      <td className="px-4 py-2 border-b">-</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">ADR Escalation</td>
                      <td className="px-4 py-2 border-b">We must cooperate</td>
                      <td className="px-4 py-2 border-b">Within 6 months of our response</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">Regulatory Complaint</td>
                      <td className="px-4 py-2 border-b">Must respond to regulator</td>
                      <td className="px-4 py-2 border-b">Check regulator's timeframes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border-t pt-8">
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-md">
                <h3 className="font-semibold text-blue-900 mb-3">Quick Reference - Complaint Process</h3>
                <div className="text-blue-800 space-y-2 text-sm">
                  <p><strong>Step 1:</strong> Contact customer support (support@casino.com, live chat, or phone)</p>
                  <p><strong>Step 2:</strong> If unresolved, escalate to formal complaint (complaints@casino.com)</p>
                  <p><strong>Step 3:</strong> If still unsatisfied, use ADR service ([ADR_PROVIDER_NAME])</p>
                  <p><strong>Step 4:</strong> As final resort, contact regulatory authority ([REGULATOR_NAME])</p>
                </div>
                <p className="text-blue-700 mt-4 font-medium">
                  Remember: We want to resolve your complaint quickly and fairly. Most issues are resolved 
                  at the customer support stage, so please start there.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
