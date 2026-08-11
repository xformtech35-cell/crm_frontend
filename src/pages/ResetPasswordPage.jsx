import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import AppAlert from '../components/common/AppAlert'
import { useAuth } from '../hooks/useAuth'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  let token = searchParams.get('token')
  if (!token && window.location.href.includes('token=')) {
    try {
      const match = window.location.href.match(/token=([^&]+)/)
      if (match) token = decodeURIComponent(match[1])
    } catch (e) {
      console.error('Error parsing reset token:', e)
    }
  }
  const navigate = useNavigate()
  const { resetPassword } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!token) {
      setError('Invalid or missing password reset token.')
      return
    }
    if (!newPassword) {
      setError('New password is required.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reset password. Token may have expired.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,#e0e7ff_0%,#f8fafc_50%,#e2e8f0_100%)] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#4f46e5_100%)] text-white shadow-lg shadow-indigo-200">
            <Icon name="mdi:shield-key-outline" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Portal</p>
            <p className="text-xl font-black text-slate-900">XForm CRM</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <Icon name="mdi:check-circle-outline" className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Password Reset Complete!</h2>
              <p className="text-sm text-slate-600">
                Your password has been updated successfully. You can now log in with your new credentials.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full mt-4 rounded-xl bg-[linear-gradient(135deg,#1d4ed8_0%,#4f46e5_100%)] py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-95"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900">Reset Your Password</h1>
                <p className="mt-1.5 text-xs text-slate-500">
                  Enter and confirm your new password below to regain access to your account.
                </p>
              </div>

              {!token && (
                <AppAlert type="error" message="No reset token found in URL. Please use the link sent to your email." className="mb-5" />
              )}

              {error && <AppAlert type="error" message={error} className="mb-5" />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pl-3 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <Icon name={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full mt-2 rounded-xl bg-[linear-gradient(135deg,#1d4ed8_0%,#4f46e5_100%)] py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
