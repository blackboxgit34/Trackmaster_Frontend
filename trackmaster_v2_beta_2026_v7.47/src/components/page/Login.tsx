import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/context/UserContext';
import Logo from '../Logo';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const { login } = useUser();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    login(email, password, "Customer");
  };

  const handlePasswordReset = () => {
    setError('');
    // In a real app, you would send a password reset email here.
    // For this demo, we'll just show a success message.
    setResetMessage(`A password reset link has been sent to ${resetEmail}.`);
    setResetEmail('');
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Logo />
            </div>
            {view === 'login' ? (
              <>
                <h1 className="text-3xl font-bold">Welcome Back</h1>
                <p className="text-balance text-muted-foreground">
                  Enter your credentials to access your dashboard
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">Forgot Password</h1>
                <p className="text-balance text-muted-foreground">
                  Enter your email to receive a reset link
                </p>
              </>
            )}
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Username</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder='Enter Username'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setView('forgot-password');
                      setError('');
                      setResetMessage('');
                    }}
                    className="ml-auto inline-block text-sm underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                Login
              </Button>
            </form>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">Username</Label>
                <Input
                  id="reset-email"
                  type="text"
                  placeholder="m@example.com"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              {resetMessage && (
                <Alert variant="default">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{resetMessage}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={handlePasswordReset}
              >
                Send Reset Link
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setView('login');
                  setError('');
                  setResetMessage('');
                }}
              >
                Back to Login
              </Button>
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            Need any help?{' '}
            <a href="#" className="underline">
              Contact Support
            </a>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1523741543342-43a26f355958?q=80&w=1374&auto=format&fit=crop"
          alt="Image"
          className="h-screen w-full object-cover dark:brightness-[0.4]"
        />
      </div>
    </div>
  );
}