/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck, AlertCircle, Key, Check } from 'lucide-react';
import { Hall, Gender } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { IS_DEMO_MODE } from '../../config/appConfig';

interface AuthModalProps {
  halls: Hall[];
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ halls, onClose }) => {
  const { signInWithGoogleSchool, signInWithEmailPassword, signUp, verifyEmailCode, isMock } = useAuth();
  const { showToast } = useNotifications();

  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>('signin');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [hallId, setHallId] = useState(halls[0]?.id || 'hall_peter');
  const [roomNumber, setRoomNumber] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [applyAsSeller, setApplyAsSeller] = useState(false);
  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTB)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // 6-digit code state
  const [verificationCode, setVerificationCode] = useState('');
  const [mockDevCode] = useState(IS_DEMO_MODE ? '123456' : '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSchoolSignIn = async () => {
    setErrorMsg(null);
    if (!schoolEmail.trim().toLowerCase().endsWith('@stu.cu.edu.ng')) {
      setErrorMsg('Google sign-in requires an official Covenant University school email ending in @stu.cu.edu.ng');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithGoogleSchool(schoolEmail.trim(), fullName.trim() || 'CU Student');
      showToast('Signed in with CU School Account', 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google School sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!personalEmail.trim() && !schoolEmail.trim()) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmailPassword(personalEmail.trim() || schoolEmail.trim());
      showToast('Signed in successfully', 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSchool = schoolEmail.trim().toLowerCase();
    if (!cleanSchool.endsWith('@stu.cu.edu.ng')) {
      setErrorMsg('Covenant school email must end in @stu.cu.edu.ng');
      return;
    }
    if (!telegramHandle.trim()) {
      setErrorMsg('Telegram handle is required for order coordination.');
      return;
    }
    if (!roomNumber.trim()) {
      setErrorMsg('Room number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        fullName: fullName.trim(),
        username: username.trim(),
        schoolEmail: cleanSchool,
        personalEmail: personalEmail.trim(),
        hallId,
        roomNumber: roomNumber.trim(),
        gender,
        telegramHandle: telegramHandle.trim(),
        matricNumber: matricNumber.trim() || undefined,
        sellerApplicationStatus: applyAsSeller ? 'pending' : 'none',
        bankDetails: applyAsSeller
          ? {
              bankName,
              accountNumber: accountNumber.trim(),
              accountName: accountName.trim(),
            }
          : undefined,
      });

      // Advance to email verification
      setMode('verify');
      showToast('Account created! Please verify your email with the 6-digit code.', 'info');
    } catch (err: any) {
      setErrorMsg(err.message || 'Sign up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const ok = await verifyEmailCode(verificationCode.trim());
      if (ok) {
        showToast('Email verified! You now have full access.', 'success');
        onClose();
      } else {
        setErrorMsg(
          IS_DEMO_MODE
            ? 'Invalid code. In demo mode, use 123456'
            : 'Invalid verification code. Please check your Covenant University email.'
        );
      }
    } catch {
      setErrorMsg('Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text-main)]">
            {mode === 'signin' ? 'Sign In to Oja' : mode === 'signup' ? 'Create Student Account' : 'Verify Email Code'}
          </h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE: SIGN IN */}
          {mode === 'signin' && (
            <div className="space-y-4">
              {/* Google CU Student Sign-In */}
              <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2.5">
                <span className="font-semibold text-[var(--color-text-main)]">Covenant Student Google Sign-In</span>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Only accounts ending in <strong>@stu.cu.edu.ng</strong> are authorized.
                </p>
                <input
                  type="email"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  placeholder="e.g. ejagun.2401221@stu.cu.edu.ng"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleGoogleSchoolSignIn}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[var(--color-brand-primary)] text-white font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Sign In with CU Google</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase">Or Email Sign In</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>

              {/* Personal Email Sign In */}
              <form onSubmit={handleSignInEmail} className="space-y-3">
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Personal or School Email</label>
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="tobilobajagun@gmail.com"
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-main)] font-semibold rounded-lg"
                >
                  Sign In with Email
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  onClick={() => setMode('signup')}
                  className="text-[var(--color-brand-primary)] hover:underline font-semibold"
                >
                  Don't have an account? Sign up here
                </button>
              </div>
            </div>
          )}

          {/* MODE: SIGN UP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tobiloba Jagun"
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Username (@) *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="tobilion"
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] mb-1 font-medium">
                  CU School Email (*@stu.cu.edu.ng) *
                </label>
                <input
                  type="email"
                  required
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  placeholder="name.matric@stu.cu.edu.ng"
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Personal Email *</label>
                <input
                  type="email"
                  required
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="tobilobajagun@gmail.com"
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Hall *</label>
                  <select
                    value={hallId}
                    onChange={(e) => setHallId(e.target.value)}
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  >
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Room *</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="C-314"
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Telegram Handle *</label>
                  <input
                    type="text"
                    required
                    value={telegramHandle}
                    onChange={(e) => setTelegramHandle(e.target.value)}
                    placeholder="@tobiloba"
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-muted)] mb-1 font-medium">Matric No (Optional)</label>
                  <input
                    type="text"
                    value={matricNumber}
                    onChange={(e) => setMatricNumber(e.target.value)}
                    placeholder="22CK031900"
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* Optional Seller Application */}
              <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--color-text-main)]">
                  <input
                    type="checkbox"
                    checked={applyAsSeller}
                    onChange={(e) => setApplyAsSeller(e.target.checked)}
                    className="accent-[var(--color-brand-primary)] rounded"
                  />
                  <span>Apply to become a campus seller</span>
                </label>

                {applyAsSeller && (
                  <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Your request will be considered by administrators. Bank details are required for payouts.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[var(--color-text-muted)] mb-1">Bank</label>
                        <select
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1.5 text-xs"
                        >
                          <option value="Guaranty Trust Bank (GTB)">GTBank</option>
                          <option value="Access Bank">Access Bank</option>
                          <option value="Zenith Bank">Zenith Bank</option>
                          <option value="Kuda Bank">Kuda Bank</option>
                          <option value="OPay">OPay</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[var(--color-text-muted)] mb-1">Account No (10 digits)</label>
                        <input
                          type="text"
                          maxLength={10}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="0123456789"
                          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-[var(--color-text-muted)] hover:underline"
                >
                  Already have an account?
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* MODE: VERIFY 6-DIGIT CODE */}
          {mode === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <p className="font-semibold text-xs flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>Email Verification Code</span>
                </p>
                <p className="text-[11px] opacity-80 mt-1">
                  A 6-digit confirmation code has been dispatched. {IS_DEMO_MODE && isMock && '(Demo Code: 123456)'}
                </p>
              </div>

              <div>
                <label className="block text-[var(--color-text-muted)] mb-1 font-medium text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={IS_DEMO_MODE ? '123456' : '······'}
                  className="w-full max-w-xs mx-auto block bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl p-3 text-center font-mono text-xl font-bold tracking-widest text-[var(--color-text-main)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={verificationCode.length !== 6 || isSubmitting}
                  className="w-full py-2.5 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  Verify & Finish Setup
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
