'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Shield, Clock, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CASINO_CONFIG } from '@/lib/casino/config';

interface CasinoLayoutProps {
  children: React.ReactNode;
}

export default function CasinoLayout({ children }: CasinoLayoutProps) {
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if casino is enabled
    if (!CASINO_CONFIG.ENABLED) {
      setIsEligible(false);
      return;
    }

    // Check jurisdiction (simplified - in real implementation would use geolocation)
    const checkEligibility = () => {
      // For demo: if allowlist is empty, block all
      if (CASINO_CONFIG.JURISDICTION_ALLOWLIST.length === 0 as any) {
        setIsEligible(false);
        return;
      }
      
      // Would implement proper geolocation check here
      setIsEligible(true);
    };

    checkEligibility();
  }, []);

  useEffect(() => {
    // Check age confirmation from session storage
    const ageConfirmedStorage = sessionStorage.getItem('casino_age_confirmed');
    setAgeConfirmed(ageConfirmedStorage === 'true');
  }, []);

  const handleAgeConfirmation = () => {
    sessionStorage.setItem('casino_age_confirmed', 'true');
    setAgeConfirmed(true);
  };

  const handleBack = () => {
    router.push('/');
  };

  // Loading state
  if (isEligible === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Checking availability...</p>
        </div>
      </div>
    );
  }

  // Casino disabled or not eligible
  if (!isEligible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Ban className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Service Not Available</CardTitle>
            <CardDescription>
              The casino module is not available in your region or is currently disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              {!CASINO_CONFIG.ENABLED 
                ? 'The casino module is currently disabled by the administrator.'
                : 'This service is not available in your jurisdiction.'}
            </p>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Main Site
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Age verification
  if (!ageConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle>Age Verification Required</CardTitle>
            <CardDescription>
              You must be at least {CASINO_CONFIG.SAFETY.AGE_MINIMUM} years old to access this section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Demo Credits Only</h4>
                    <p className="text-blue-800 text-sm">
                      This platform uses demo credits only. No real money is involved.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-900 mb-1">Responsible Gaming</h4>
                    <p className="text-amber-800 text-sm">
                      Play responsibly. Set time and loss limits for yourself.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600 mb-6">
              <p>By continuing, you confirm that:</p>
              <ul className="list-disc text-left mt-2 space-y-1 ml-6">
                <li>You are at least {CASINO_CONFIG.SAFETY.AGE_MINIMUM} years old</li>
                <li>You understand this uses demo credits only</li>
                <li>You will play responsibly</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleAgeConfirmation} className="flex-1">
                I Confirm
              </Button>
            </div>

            <div className="text-center mt-4">
              <a
                href={CASINO_CONFIG.SAFETY.RESPONSIBLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Learn about responsible gaming →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main casino layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-white text-xl font-bold">
                Business CMS
              </Link>
              <div className="text-white/60 text-sm">
                / Demo Casino
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-1">
                <span className="text-yellow-300 text-xs font-medium">DEMO CREDITS ONLY</span>
              </div>
              <Link href="/">
                <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Exit Casino
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-black/30 backdrop-blur-sm border-t border-white/10 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-white/60 text-sm space-y-2">
            <p>
              <strong>Demo Credits Only</strong> - No real money gambling. 
              Must be {CASINO_CONFIG.SAFETY.AGE_MINIMUM}+ to play.
            </p>
            <p>
              <a 
                href={CASINO_CONFIG.SAFETY.RESPONSIBLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Responsible Gaming Resources
              </a>
              {' '} | {' '}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </Link>
              {' '} | {' '}
              <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
