import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/context/UserContext';
import Logo from '../Logo';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { API_BASE_URL } from '@/config/Api';

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'forgot-password' | 'otp-verification' | 'update-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const { login } = useUser();
  const [loading, setLoading] = useState(false);
  const [custId, setCustId] = useState<number | null>(null);
  const handleLogin = async (e: React.FormEvent) => {
    try {
      setLoading(true);
      e.preventDefault();
      setError('');
      setResetMessage('');
      const user = await login(email, password, "Customer");
      if (user.message != "Login successful") {
        setError(user.message);
      }
    }
    catch (err) {
      setError("Something went wrong. Please try again.");
    }
    finally {
      setLoading(false);
    }
  };

  const baseUrl = window.location.origin;
  const handlePasswordReset = async () => {
    try {
      if (resetEmail.trim() === '') {
        setError("Please enter your valid username or e-mail !");
        return;
      }
      setLoading(true);
      setError('');

      const url = `${API_BASE_URL}/Account/VerifyUser?username=${resetEmail}&website=${encodeURIComponent(baseUrl)}`;

      const res = await fetch(url, { method: "GET" });
      const response = await res.json();

      const mobile = response.number || "";

      if (response.message === "Success" && response.custid) {
        setCustId(response.custid);
          const maskedNumber =
    mobile.length > 4
      ? mobile.slice(0, -4).replace(/./g, "*") + mobile.slice(-4)
      : mobile;
        setResetMessage(
          `You will receive OTP on register No ${maskedNumber}. Kindly wait for 2 min in case of delay.`
        );
        setResetEmail('');
        setView('otp-verification');
      } else {
        setError(response.message || "Password reset failed");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async () => {
    try {
      if (resetOTP.trim().length != 4) {
        setError("Please enter valid otp !");
        return;
      }
      setLoading(true);
      setError('');

      const url = `${API_BASE_URL}/Account/VerifyUserOtp?custid=${custId}&website=${encodeURIComponent(baseUrl)}&otp=${resetOTP}`;

      const res = await fetch(url, { method: "GET" });
      const response = await res.json();

      if (response.message === "Verified") {
        setResetMessage(
          `OTP Verified successfuly .`
        );
        setResetOTP('');
        setView('update-password');
      } else {
        setError(response.message || "OTP verification failed");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (newPassword.trim() === '') {
        setError("Please enter a new password");
        return;
      }
      if (confirmPassword.trim() === '') {
        setError("Please confirm your password");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setLoading(true);
      setError('');

      const url = `${API_BASE_URL}/Account/OTPChangePassword?custId=${custId}&NewPassword=${encodeURIComponent(newPassword)}`;

      const res = await fetch(url, { method: "Get" });
      const response = await res.text();

      if (response === "Success") {
        setResetMessage(
          `Password updated successfully.`
        );
        setNewPassword('');
        setConfirmPassword('');
        setView('login');
      } else {
        setError(response || "Password update failed");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      {loading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
            <span>Please wait...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Logo />
            </div>
            {view === 'login' && (
              <>
                <h1 className="text-3xl font-bold">Welcome Back</h1>
                <p className="text-balance text-muted-foreground">
                  Enter your credentials to access your dashboard
                </p>
              </>
            )}

            {view === 'forgot-password' && (
              <>
                <h1 className="text-3xl font-bold">Forgot Password</h1>
                <p className="text-balance text-muted-foreground">
                  Enter your username or e-mail to receive a mobile otp
                </p>
              </>
            )}

            {view === 'otp-verification' && (
              <>
                <h1 className="text-3xl font-bold">Verify OTP</h1>
                <p className="text-balance text-muted-foreground">
                  Enter the OTP sent to your registered mobile number
                </p>
              </>
            )}

            {view === 'update-password' && (
              <>
                <h1 className="text-3xl font-bold">Update Password</h1>
                <p className="text-balance text-muted-foreground">
                  Enter your new password below
                </p>
              </>
            )}
          </div>

          {view === 'login' && (
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
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
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
              {resetMessage && (
                <Alert variant="default">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{resetMessage}</AlertDescription>
                </Alert>
              )}
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
          )}
          {view === 'forgot-password' && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">Username / E-mail</Label>
                <Input
                  id="reset-email"
                  type="text"
                  placeholder="Enter username or e-mail"
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
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Failed to send OTP !</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={handlePasswordReset}
              >
                Send OTP
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
          {view === 'otp-verification' && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="OTP">OTP</Label>
                <Input
                  id="OTP"
                  type="text"
                  placeholder="Enter otp"
                  required
                  value={resetOTP}
                  onChange={(e) => setResetOTP(e.target.value)}
                />
              </div>
              {resetMessage && (
                <Alert variant="default">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{resetMessage}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Failed to verify OTP !</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={handleOTPVerify}
              >
                Verify OTP
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
          {view === 'update-password' && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="OTP">New Password</Label>
                <Input
                  id="OTP"
                  type="password"
                  placeholder="Enter password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="OTP">Confirm Password</Label>
                <Input
                  id="OTP"
                  type="password"
                  placeholder="Enter confirm password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {resetMessage && (
                <Alert variant="default">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{resetMessage}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Failed to update password !</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={handleUpdatePassword}
              >
                Update Password
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