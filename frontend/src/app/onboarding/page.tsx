'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Building2, Globe, DollarSign, User, ChevronRight, ChevronLeft,
  CheckCircle2, Upload, X,
} from 'lucide-react'
import { createCompanySettings, uploadCompanyLogo } from '@/lib/api'

// ── Country → identifier mapping ─────────────────────────────────────────────
const EU_COUNTRIES = [
  'DE','FR','IT','ES','NL','BE','AT','PT','SE','DK','FI','IE','GR',
  'CZ','HU','PL','RO','BG','HR','SK','SI','EE','LV','LT','LU','MT','CY',
]
function getIdentifierType(countryCode: string): string {
  if (countryCode === 'US') return 'EIN'
  if (countryCode === 'GB') return 'VAT'
  if (countryCode === 'CA') return 'BN'
  if (countryCode === 'AU') return 'ABN'
  if (countryCode === 'JP') return 'Corporate Number'
  if (countryCode === 'CN') return 'USCC'
  if (countryCode === 'IN') return 'GSTIN'
  if (EU_COUNTRIES.includes(countryCode)) return 'VAT'
  return 'Tax ID'
}

const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'TR', name: 'Turkey' }, { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' }, { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' }, { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' }, { code: 'AT', name: 'Austria' },
  { code: 'PT', name: 'Portugal' }, { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' }, { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' }, { code: 'RO', name: 'Romania' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' }, { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' }, { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' }, { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' }, { code: 'SA', name: 'Saudi Arabia' },
]

const CURRENCIES = [
  'USD','EUR','TRY','GBP','JPY','CAD','AUD','CHF','CNY',
  'SEK','NOK','DKK','INR','BRL','MXN','SGD','HKD','PLN','CZK','HUF',
]

const INDUSTRIES = ['Manufacturing','Retail','SaaS','Logistics','Other']
const COMPANY_SIZES = ['1–10','11–50','51–200','200+']

const STEPS = [
  { label: 'Company Identity', icon: Building2 },
  { label: 'Company Profile', icon: Globe },
  { label: 'Financial Settings', icon: DollarSign },
  { label: 'Contact Information', icon: User },
]

interface FormState {
  company_name: string
  legal_country: string
  identifier_type: string
  identifier_value: string
  logo_file: File | null
  logo_preview: string | null
  industry: string
  company_size: string
  base_currency: string
  fiscal_year_start: string
  contact_name: string
  contact_email: string
  contact_phone: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormState>({
    company_name: '',
    legal_country: 'US',
    identifier_type: 'EIN',
    identifier_value: '',
    logo_file: null,
    logo_preview: null,
    industry: '',
    company_size: '',
    base_currency: 'USD',
    fiscal_year_start: '01-01',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleCountryChange(code: string) {
    set('legal_country', code)
    set('identifier_type', getIdentifierType(code))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    set('logo_file', file)
    const reader = new FileReader()
    reader.onload = ev => set('logo_preview', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function validateStep(): string {
    if (step === 0) {
      if (!form.company_name.trim()) return 'Company name is required.'
      if (!form.identifier_value.trim()) return `${form.identifier_type} is required.`
    }
    if (step === 3) {
      if (!form.contact_name.trim()) return 'Contact name is required.'
      if (!form.contact_email.trim() || !form.contact_email.includes('@'))
        return 'A valid contact email is required.'
    }
    return ''
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function back() { setError(''); setStep(s => Math.max(s - 1, 0)) }

  async function handleSubmit() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)
    try {
      await createCompanySettings({
        identity: {
          company_name: form.company_name,
          legal_country: form.legal_country,
          identifier_type: form.identifier_type,
          identifier_value: form.identifier_value,
        },
        profile: {
          logo_url: null,
          industry: form.industry || null,
          company_size: form.company_size || null,
        },
        financial: {
          base_currency: form.base_currency,
          fiscal_year_start: form.fiscal_year_start,
        },
        contact: {
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone || null,
        },
      })
      // Upload logo if provided
      if (form.logo_file) {
        try { await uploadCompanyLogo(form.logo_file) } catch { /* non-fatal */ }
      }
      // Set onboarded cookie via a small fetch
      await fetch('/api/auth/mark-onboarded', { method: 'POST' })
      router.push('/dashboard')
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'An error occurred'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <div className="relative h-10 w-28">
          <Image src="/lumina.png" alt="Lumina" fill className="object-contain object-left" priority />
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center pt-8 sm:pt-12 px-4 pb-16">
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = i < step
              const active = i === step
              return (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={[
                      'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : active
                          ? 'bg-white border-emerald-500 text-emerald-600'
                          : 'bg-white border-slate-200 text-slate-400',
                    ].join(' ')}>
                      {done ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>
                    <span className={[
                      'hidden sm:block text-xs mt-1.5 font-medium text-center max-w-[72px]',
                      active ? 'text-emerald-600' : done ? 'text-slate-600' : 'text-slate-400',
                    ].join(' ')}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={[
                      'flex-1 h-0.5 mx-3 mt-[-12px] transition-all',
                      done ? 'bg-emerald-500' : 'bg-slate-200',
                    ].join(' ')} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {/* Step 0: Company Identity */}
            {step === 0 && (
              <StepSection title="Company Identity" subtitle="Tell us about your organisation's legal identity.">
                <Field label="Company Name" required>
                  <input
                    className={INPUT}
                    placeholder="Acme Corporation"
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                  />
                </Field>
                <Field label="Legal Country" required>
                  <select
                    className={INPUT}
                    value={form.legal_country}
                    onChange={e => handleCountryChange(e.target.value)}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={form.identifier_type} required>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium">
                      {form.identifier_type}
                    </span>
                    <input
                      className={`${INPUT} flex-1`}
                      placeholder={`Enter ${form.identifier_type}`}
                      value={form.identifier_value}
                      onChange={e => set('identifier_value', e.target.value)}
                    />
                  </div>
                </Field>
              </StepSection>
            )}

            {/* Step 1: Company Profile */}
            {step === 1 && (
              <StepSection title="Company Profile" subtitle="Help us personalise your Lumina experience.">
                {/* Logo upload */}
                <Field label="Company Logo" hint="Optional — PNG, JPG, SVG (max 5 MB)">
                  <div className="flex items-center gap-4">
                    {form.logo_preview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.logo_preview} alt="Logo preview"
                          className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1" />
                        <button
                          type="button"
                          onClick={() => { set('logo_file', null); set('logo_preview', null) }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] text-slate-400 mt-0.5">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      </label>
                    )}
                    <div className="text-sm text-slate-500">
                      {form.logo_preview ? 'Logo selected. Save to upload.' : 'Your logo will appear across reports and emails.'}
                    </div>
                  </div>
                </Field>
                <Field label="Industry">
                  <select
                    className={INPUT}
                    value={form.industry}
                    onChange={e => set('industry', e.target.value)}
                  >
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Company Size">
                  <div className="grid grid-cols-4 gap-2">
                    {COMPANY_SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => set('company_size', size)}
                        className={[
                          'py-2.5 rounded-lg border text-sm font-medium transition-all',
                          form.company_size === size
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300',
                        ].join(' ')}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </Field>
              </StepSection>
            )}

            {/* Step 2: Financial Settings */}
            {step === 2 && (
              <StepSection title="Financial Settings" subtitle="Configure currency and accounting period defaults.">
                <Field label="Base Currency" required>
                  <div className="grid grid-cols-4 gap-2">
                    {CURRENCIES.slice(0, 8).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set('base_currency', c)}
                        className={[
                          'py-2 rounded-lg border text-sm font-medium transition-all',
                          form.base_currency === c
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300',
                        ].join(' ')}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <select
                    className={`${INPUT} mt-2`}
                    value={form.base_currency}
                    onChange={e => set('base_currency', e.target.value)}
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Fiscal Year Start" hint="Month and day when your accounting year begins">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Month</label>
                      <select
                        className={INPUT}
                        value={form.fiscal_year_start.split('-')[0]}
                        onChange={e => {
                          const day = form.fiscal_year_start.split('-')[1] || '01'
                          set('fiscal_year_start', `${e.target.value}-${day}`)
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = String(i + 1).padStart(2, '0')
                          return <option key={m} value={m}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
                        })}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-slate-500 mb-1 block">Day</label>
                      <select
                        className={INPUT}
                        value={form.fiscal_year_start.split('-')[1]}
                        onChange={e => {
                          const month = form.fiscal_year_start.split('-')[0] || '01'
                          set('fiscal_year_start', `${month}-${e.target.value}`)
                        }}
                      >
                        {Array.from({ length: 31 }, (_, i) => {
                          const d = String(i + 1).padStart(2, '0')
                          return <option key={d} value={d}>{d}</option>
                        })}
                      </select>
                    </div>
                  </div>
                </Field>
              </StepSection>
            )}

            {/* Step 3: Contact Info */}
            {step === 3 && (
              <StepSection title="Contact Information" subtitle="Primary contact for this Lumina account.">
                <Field label="Full Name" required>
                  <input
                    className={INPUT}
                    placeholder="Jane Smith"
                    value={form.contact_name}
                    onChange={e => set('contact_name', e.target.value)}
                  />
                </Field>
                <Field label="Email Address" required>
                  <input
                    type="email"
                    className={INPUT}
                    placeholder="jane@company.com"
                    value={form.contact_email}
                    onChange={e => set('contact_email', e.target.value)}
                  />
                </Field>
                <Field label="Phone Number" hint="Optional">
                  <input
                    type="tel"
                    className={INPUT}
                    placeholder="+1 555 000 0000"
                    value={form.contact_phone}
                    onChange={e => set('contact_phone', e.target.value)}
                  />
                </Field>
              </StepSection>
            )}

            {/* Error */}
            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={[
                    'w-1.5 h-1.5 rounded-full transition-all',
                    i === step ? 'bg-emerald-500 w-4' : 'bg-slate-200',
                  ].join(' ')} />
                ))}
              </div>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Complete Setup</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-white'

function StepSection({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-1">{title}</h2>
      <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-2 text-xs text-slate-400 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
