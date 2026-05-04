import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Check, ShieldCheck, Cpu, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { loginSuccess, loginFailure, loginStart } from '../store/slices/authSlice';
import { loginWithPassword, loginWithGoogleCredential } from '../services/api';

function waitForGoogleIdentity(maxMs = 10_000) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Client only'));
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const id = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(id);
        resolve();
        return;
      }
      if (Date.now() - t0 > maxMs) {
        clearInterval(id);
        reject(new Error('Google sign-in script did not load. Check your network or ad blocker.'));
      }
    }, 50);
  });
}

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setFormError('');
    dispatch(loginStart());
    setIsLoading(true);
    try {
      const data = await loginWithPassword(email.trim(), password);
      const profile = {
        id: String(data.user?.id ?? ''),
        email: data.user?.email ?? email,
        name: data.user?.email?.split('@')[0] ?? 'User',
      };
      localStorage.setItem('medscan_user', JSON.stringify(profile));
      dispatch(loginSuccess(profile));
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Login failed';
      dispatch(loginFailure(msg));
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFormError('');
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!cid) {
      setFormError('Set VITE_GOOGLE_CLIENT_ID in frontend/.env (same as GOOGLE_OAUTH_CLIENT_ID), then restart Vite.');
      return;
    }
    try {
      await waitForGoogleIdentity();
    } catch (e) {
      setFormError(e?.message || 'Could not load Google sign-in.');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: cid,
      callback: async (resp) => {
        if (!resp.credential) return;
        dispatch(loginStart());
        setIsLoading(true);
        try {
          const data = await loginWithGoogleCredential(resp.credential);
          const profile = {
            id: String(data.user?.id ?? ''),
            email: data.user?.email ?? '',
            name: data.user?.email?.split('@')[0] ?? 'User',
          };
          localStorage.setItem('medscan_user', JSON.stringify(profile));
          dispatch(loginSuccess(profile));
          navigate('/dashboard');
        } catch (err) {
          const msg = err.response?.data?.message || err.message || 'Google sign-in failed';
          dispatch(loginFailure(msg));
          setFormError(msg);
        } finally {
          setIsLoading(false);
        }
      },
    });
    window.google.accounts.id.prompt();
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <div className="min-h-screen flex items-stretch bg-white">
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-6 sm:px-12 py-12 relative z-10 bg-white">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-[380px]"
        >
          <motion.div variants={fadeUp} className="flex justify-center items-center gap-2 mb-10">
            <span className="bg-[#0f803f] text-white rounded-[6px] w-7 h-7 flex items-center justify-center text-xl font-black leading-none">
              +
            </span>
            <span className="font-extrabold text-2xl tracking-tight text-[#0B1B2B]">MedScan</span>
          </motion.div>

          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-[26px] font-bold text-[#0B1B2B] mb-2 tracking-tight">Welcome Back!</h2>
            <p className="text-[15px] text-gray-500 font-medium">Sign in to continue to your account</p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <button
              type="button"
              onClick={() => handleGoogle()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-white text-[15px] font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="my-7 flex items-center justify-center">
            <div className="border-t border-gray-200 flex-grow" />
            <span className="px-4 text-[13px] text-gray-400 font-medium">or</span>
            <div className="border-t border-gray-200 flex-grow" />
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-5">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
            )}
            <motion.div variants={fadeUp}>
              <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[15px] focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] transition-all bg-white placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="block text-[13px] font-bold text-gray-700">Password</label>
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[15px] focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] transition-all bg-white placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
              />
            </motion.div>

            <motion.div variants={fadeUp} className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0f803f] hover:bg-[#0c6b34] text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_4px_14px_rgba(15,128,63,0.25)] transition-all disabled:opacity-60"
              >
                {isLoading ? 'Signing in...' : 'Log In'}
              </button>
            </motion.div>
          </form>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <p className="text-[14px] text-gray-500 font-medium">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-[#0f803f] font-bold hover:underline">
                Sign up
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>

      <div className="hidden lg:flex w-[55%] bg-[#F8FAFC] flex-col justify-center items-center py-12 px-16 border-l border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-100 rounded-full opacity-30 blur-[80px] transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50 rounded-full opacity-40 blur-[80px] transform -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-[420px] relative z-10"
        >
          <div className="space-y-8 pl-2">
            <motion.div variants={fadeUp} className="flex items-start gap-5 group">
              <div className="bg-white p-3.5 rounded-2xl text-gray-700 shadow-sm border border-gray-100 group-hover:shadow-md group-hover:scale-105 transition-all">
                <ShieldCheck size={26} strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[17px] font-bold text-[#0B1B2B]">Secure & Private</h3>
                <p className="text-[14px] text-gray-500 mt-1 font-medium leading-relaxed">
                  Your data is encrypted. MedScan is informational only—not a substitute for clinical care.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-start gap-5 group">
              <div className="bg-white p-3.5 rounded-2xl text-gray-700 shadow-sm border border-gray-100 group-hover:shadow-md group-hover:scale-105 transition-all">
                <Cpu size={26} strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[17px] font-bold text-[#0B1B2B]">Live pharmacy prices</h3>
                <p className="text-[14px] text-gray-500 mt-1 font-medium leading-relaxed">
                  Comparisons come from real storefront pages at query time.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-start gap-5 group">
              <div className="bg-white p-3.5 rounded-2xl text-gray-700 shadow-sm border border-gray-100 group-hover:shadow-md group-hover:scale-105 transition-all">
                <Award size={26} strokeWidth={1.5} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[17px] font-bold text-[#0B1B2B]">Built for India</h3>
                <p className="text-[14px] text-gray-500 mt-1 font-medium leading-relaxed">
                  Designed for Indian pharmacies and INR pricing context.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
