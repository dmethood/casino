import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Responsible Gambling Policy | Licensed Casino Platform',
  description: 'Our commitment to responsible gambling, player protection, and safer gaming practices.',
};

export default function ResponsibleGamblingPage() {
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
              Responsible Gambling Policy
            </h1>
            <p className="text-gray-600">Last updated: {lastUpdated}</p>
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 font-medium">
                🛡️ PLAYER PROTECTION: We are committed to providing a safe and responsible gaming environment 
                for all our players, in compliance with regulatory requirements.
              </p>
            </div>
          </header>

          <div className="space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Our Commitment</h2>
              <p className="mb-4">
                As a licensed gambling operator, we are committed to promoting responsible gambling and preventing 
                gambling-related harm. We provide tools, resources, and support to help players maintain control 
                over their gambling activities.
              </p>
              <p className="mb-4">
                This policy is developed in accordance with regulatory requirements including the 
                UK Gambling Commission's Licence Conditions and Codes of Practice, Malta Gaming Authority guidelines, 
                and other applicable regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. What is Problem Gambling?</h2>
              <p className="mb-4">
                Problem gambling occurs when gambling activities negatively impact your life, relationships, 
                finances, or mental health. Warning signs may include:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Spending more money or time gambling than you can afford</li>
                <li>Gambling as an escape from personal problems or negative emotions</li>
                <li>Lying to family or friends about gambling activities</li>
                <li>Chasing losses with bigger bets</li>
                <li>Neglecting work, family, or personal responsibilities</li>
                <li>Borrowing money to fund gambling</li>
                <li>Feeling anxious, depressed, or irritable when not gambling</li>
                <li>Unable to control or stop gambling despite wanting to</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Responsible Gambling Tools</h2>
              <p className="mb-4">
                We provide comprehensive tools to help you maintain control over your gambling:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-blue-900 mb-3">💰 Financial Controls</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li>• Daily, weekly, and monthly deposit limits</li>
                    <li>• Loss limits to prevent excessive spending</li>
                    <li>• Wagering limits for individual bets</li>
                    <li>• Net deposit limits (deposits minus withdrawals)</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-green-900 mb-3">⏰ Time Controls</h3>
                  <ul className="space-y-2 text-green-800">
                    <li>• Session time limits</li>
                    <li>• Daily time limits</li>
                    <li>• Automatic logouts</li>
                    <li>• Reality checks and reminders</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-purple-900 mb-3">🔄 Cooling-Off Periods</h3>
                  <ul className="space-y-2 text-purple-800">
                    <li>• 24-hour cooling-off</li>
                    <li>• 48-hour cooling-off</li>
                    <li>• 7-day cooling-off</li>
                    <li>• Account suspension options</li>
                  </ul>
                </div>

                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-red-900 mb-3">🚫 Self-Exclusion</h3>
                  <ul className="space-y-2 text-red-800">
                    <li>• 1 month self-exclusion</li>
                    <li>• 3 months self-exclusion</li>
                    <li>• 6 months self-exclusion</li>
                    <li>• Permanent self-exclusion</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How to Set Limits</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-medium mb-3">Setting Your Limits:</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Log into your account and navigate to "Responsible Gambling"</li>
                  <li>Choose the type of limit you want to set</li>
                  <li>Enter the amount or time limit</li>
                  <li>Confirm your choice - limits take effect immediately</li>
                  <li>Decreases take effect immediately; increases require a 24-hour cooling-off period</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-yellow-700 space-y-1">
                  <li>• Limits cannot be removed during cooling-off periods</li>
                  <li>• Some jurisdictions require mandatory limits that cannot be changed</li>
                  <li>• All limit changes are logged and monitored</li>
                  <li>• You may be asked to provide additional verification for limit increases</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Reality Checks and Reminders</h2>
              <p className="mb-4">
                We provide automatic reality checks to help you stay aware of your gambling activity:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Pop-up reminders showing time spent gambling</li>
                <li>Notifications about money spent and lost</li>
                <li>Session summaries with gambling statistics</li>
                <li>Weekly and monthly activity reports</li>
                <li>Balance change notifications</li>
              </ul>
              
              <p className="mb-4">
                Reality check frequency can be customized, but cannot be disabled entirely in compliance 
                with regulatory requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Self-Assessment Tools</h2>
              <p className="mb-4">
                Use our self-assessment questionnaire to evaluate your gambling habits. This confidential 
                tool helps identify potential concerns and provides personalized recommendations.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Quick Self-Check Questions:</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• Do you gamble longer than planned?</li>
                  <li>• Do you gamble to escape problems or feelings?</li>
                  <li>• Have you lied about your gambling?</li>
                  <li>• Do you chase losses with bigger bets?</li>
                  <li>• Has gambling affected your relationships or work?</li>
                </ul>
                <p className="text-blue-600 mt-3 font-medium">
                  If you answered "yes" to any of these questions, consider using our responsible gambling tools 
                  or seeking professional help.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Getting Help and Support</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">Professional Support Organizations</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                
                <div className="border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900">🇬🇧 United Kingdom</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>GamCare</strong></p>
                    <p>Phone: 0808 8020 133 (Free, 24/7)</p>
                    <p>Website: <a href="https://www.gamcare.org.uk" className="text-blue-600 hover:underline">gamcare.org.uk</a></p>
                    <p>Live Chat: Available on website</p>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    <p><strong>Gamblers Anonymous UK</strong></p>
                    <p>Phone: 020 7384 3040</p>
                    <p>Website: <a href="https://www.gamblersanonymous.org.uk" className="text-blue-600 hover:underline">gamblersanonymous.org.uk</a></p>
                  </div>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900">🇪🇺 Europe</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>BetBlocker</strong></p>
                    <p>Free gambling blocking software</p>
                    <p>Website: <a href="https://www.betblocker.org" className="text-blue-600 hover:underline">betblocker.org</a></p>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    <p><strong>Gambling Therapy</strong></p>
                    <p>Global online support</p>
                    <p>Website: <a href="https://www.gamblingtherapy.org" className="text-blue-600 hover:underline">gamblingtherapy.org</a></p>
                  </div>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900">🇺🇸 United States</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>National Problem Gambling Helpline</strong></p>
                    <p>Phone: 1-800-522-4700 (24/7)</p>
                    <p>Website: <a href="https://www.ncpgambling.org" className="text-blue-600 hover:underline">ncpgambling.org</a></p>
                  </div>
                </div>

                <div className="border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900">🇦🇺 Australia</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>Gambling Help Online</strong></p>
                    <p>Phone: 1800 858 858 (24/7)</p>
                    <p>Website: <a href="https://www.gamblinghelponline.org.au" className="text-blue-600 hover:underline">gamblinghelponline.org.au</a></p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Software Blocking Tools</h3>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li><strong>GamBlock:</strong> <a href="https://www.gamblock.com" className="text-blue-600 hover:underline">gamblock.com</a></li>
                <li><strong>BetBlocker:</strong> <a href="https://www.betblocker.org" className="text-blue-600 hover:underline">betblocker.org</a> (Free)</li>
                <li><strong>Cold Turkey Blocker:</strong> <a href="https://www.getcoldturkey.com" className="text-blue-600 hover:underline">getcoldturkey.com</a></li>
                <li><strong>Net Nanny:</strong> <a href="https://www.netnanny.com" className="text-blue-600 hover:underline">netnanny.com</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Multi-Operator Self-Exclusion</h2>
              <p className="mb-4">
                We participate in industry-wide self-exclusion schemes that block access across multiple operators:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>GAMSTOP (UK):</strong> <a href="https://www.gamstop.co.uk" className="text-blue-600 hover:underline">gamstop.co.uk</a></li>
                <li><strong>ROFUS (Sweden):</strong> Self-exclusion database for Swedish operators</li>
                <li><strong>CRUKS (Netherlands):</strong> Central Register of Exclusion of Chance Games</li>
              </ul>
              <p className="mb-4">
                These services allow you to exclude yourself from all participating gambling sites with a single registration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Underage Gambling Prevention</h2>
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-medium text-red-900 mb-3">Zero Tolerance Policy</h3>
                <p className="text-red-800 mb-4">
                  Gambling is strictly prohibited for anyone under 18 years of age. We employ multiple 
                  safeguards to prevent underage gambling:
                </p>
                <ul className="text-red-800 space-y-1">
                  <li>• Mandatory age verification before account activation</li>
                  <li>• Document verification for all users</li>
                  <li>• Regular monitoring and compliance checks</li>
                  <li>• Immediate account closure for underage users</li>
                  <li>• Reporting to regulatory authorities</li>
                </ul>
              </div>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">Parental Controls</h3>
              <p className="mb-4">Parents concerned about underage gambling can:</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Install parental control software</li>
                <li>Monitor internet activity and financial transactions</li>
                <li>Contact customer support if they suspect underage gambling</li>
                <li>Use ISP-level blocking services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Staff Training and Intervention</h2>
              <p className="mb-4">
                Our staff are trained to identify signs of problem gambling and respond appropriately:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Regular training on responsible gambling practices</li>
                <li>Guidelines for customer interactions and interventions</li>
                <li>Escalation procedures for concerning behavior</li>
                <li>Ongoing monitoring of player activity patterns</li>
                <li>Proactive outreach to at-risk players</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Complaints and Feedback</h2>
              <p className="mb-4">
                If you have concerns about our responsible gambling measures or need additional support:
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-medium mb-3">Contact Information:</h3>
                <ul className="space-y-2">
                  <li><strong>Customer Support:</strong> <a href="mailto:support@casino.com" className="text-blue-600 hover:underline">support@casino.com</a></li>
                  <li><strong>Responsible Gambling Team:</strong> <a href="mailto:rg@casino.com" className="text-blue-600 hover:underline">rg@casino.com</a></li>
                  <li><strong>24/7 Live Chat:</strong> Available on our platform</li>
                  <li><strong>Phone:</strong> Available during business hours</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Financial Safeguards</h2>
              <p className="mb-4">
                We implement additional financial protections:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Affordability checks for high-value deposits</li>
                <li>Source of funds verification when required</li>
                <li>Monitoring for unusual spending patterns</li>
                <li>Cooling-off periods for limit increases</li>
                <li>Automatic interventions for rapid spending</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Marketing and Promotions</h2>
              <p className="mb-4">
                Our marketing practices prioritize responsible gambling:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>No marketing to self-excluded or vulnerable players</li>
                <li>Responsible gambling messaging in all communications</li>
                <li>No misleading claims about winning opportunities</li>
                <li>Age-appropriate marketing restrictions</li>
                <li>Easy opt-out from marketing communications</li>
              </ul>
            </section>

            <section className="border-t pt-8">
              <div className="bg-green-50 border border-green-200 p-6 rounded-md">
                <h3 className="font-semibold text-green-900 mb-3">Remember: Gambling Should Be Fun</h3>
                <p className="text-green-800 mb-3">
                  Gambling should be an enjoyable recreational activity, not a way to make money or solve financial problems.
                </p>
                <div className="text-green-700 space-y-2">
                  <p>✓ Set limits before you play</p>
                  <p>✓ Never chase your losses</p>
                  <p>✓ Take regular breaks</p>
                  <p>✓ Don't gamble when upset or under the influence</p>
                  <p>✓ Keep gambling in perspective with other activities</p>
                </div>
                <p className="text-green-800 mt-4 font-medium">
                  If gambling stops being fun, it's time to take a break.
                </p>
              </div>
            </section>

            <section className="border-t pt-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help Now?</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  <a 
                    href="/responsible-gambling/self-assessment" 
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Take Self-Assessment
                  </a>
                  <a 
                    href="/responsible-gambling/tools" 
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Set Limits
                  </a>
                  <a 
                    href="/contact" 
                    className="bg-amber-600 text-white px-6 py-2 rounded-md hover:bg-amber-700 transition-colors"
                  >
                    Get Support
                  </a>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
