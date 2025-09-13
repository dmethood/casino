import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignUpPage() {
  const registrationEnabled = process.env.REGISTRATION_ENABLED === 'true';

  if (!registrationEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Business CMS
            </Link>
            <p className="mt-2 text-gray-600">
              Account Registration
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Mail className="h-8 w-8 text-gray-600" />
              </div>
              <CardTitle>Registration Closed</CardTitle>
              <CardDescription>
                New account registration is currently disabled
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-gray-600">
                To request access to this system, please contact the administrator.
                They will be able to create an account for you.
              </p>

              <div className="space-y-4">
                <Link href="mailto:admin@example.com">
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Administrator
                  </Button>
                </Link>

                <Link href="/signin">
                  <Button variant="ghost" className="w-full">
                    Back to Sign In
                  </Button>
                </Link>
              </div>

              <div className="pt-6 border-t">
                <p className="text-xs text-gray-500">
                  If you already have an account, you can{' '}
                  <Link href="/signin" className="font-medium text-blue-600 hover:text-blue-500">
                    sign in here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If registration is enabled, show a basic registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
            <CardDescription>
              Registration feature coming soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Registration functionality is not yet implemented. Please contact the administrator.
            </p>
            <Link href="/signin">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
