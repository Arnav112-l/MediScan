import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ShieldCheck, Cpu, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { loginSuccess, loginFailure, loginStart } from '../store/slices/authSlice';
import { registerAccount, loginWithPassword } from '../services/api';

const SignupPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setFormError('');
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    dispatch(loginStart());
    setIsLoading(true);
    try {
      await registerAccount(email.trim(), password);
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
        'Could not create account';
      dispatch(loginFailure(msg));
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
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
            <h2 className="text-[26px] font-bold text-[#0B1B2B] mb-2 tracking-tight">Create your account</h2>
            <p className="text-[15px] text-gray-500 font-medium">
              Sign up with email — you&apos;ll be signed in automatically.
            </p>
          </motion.div>

          <form onSubmit={handleSignup} className="space-y-5">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
            )}
            <motion.div variants={fadeUp}>
              <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[15px] focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] transition-all bg-white placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[15px] focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] transition-all bg-white placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <label className="block text-[13px] font-bold text-gray-700 mb-1.5 ml-1">Confirm password</label>
              <input
                type="password"
                placeholder="Repeat your password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[15px] focus:ring-2 focus:ring-[#0f803f]/20 focus:border-[#0f803f] transition-all bg-white placeholder-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </motion.div>

            <motion.div variants={fadeUp} className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0f803f] hover:bg-[#0c6b34] text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_4px_14px_rgba(15,128,63,0.25)] transition-all disabled:opacity-60"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </motion.div>
          </form>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <p className="text-[14px] text-gray-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0f803f] font-bold hover:underline">
                Log in
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

export default SignupPage;
