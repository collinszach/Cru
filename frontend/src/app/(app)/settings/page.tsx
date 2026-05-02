'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/nextjs';
import { Upload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardBody } from '@/components/ui/Card';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const SCORING_SYSTEMS = [
  { value: '100pt', label: '100-point', description: 'Parker / Wine Spectator scale' },
  { value: '20pt', label: '20-point', description: 'Jancis Robinson / WSET scale' },
  { value: '5star', label: '5-star', description: 'Simple 5-star rating' },
];

// Top wine-producing countries first, then alphabetical remainder
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'DE', name: 'Germany' },
  { code: 'PT', name: 'Portugal' },
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AT', name: 'Austria' },
  { code: 'HU', name: 'Hungary' },
  { code: 'GR', name: 'Greece' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'RO', name: 'Romania' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'IL', name: 'Israel' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
];

// ─── CellarTracker Import ─────────────────────────────────────────────────────

type ImportStatus = 'idle' | 'uploading' | 'success' | 'error';

function CellarTrackerImport() {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setStatus('error');
      return;
    }
    setStatus('uploading');
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/api/v1/cellar/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Import failed');
      const data = await res.json() as { imported: number; errors: number };
      setResult(data);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-body text-cru-text-muted mb-1">
          Import your existing collection from CellarTracker.
        </p>
        <a
          href="https://www.cellartracker.com/list.asp?Table=List"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-ui underline"
          className="text-cru-accent-garnet"
        >
          How to export from CellarTracker →
        </a>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className="p-8 rounded border-2 text-center cursor-pointer transition-all duration-200"
        style={{
          borderStyle: 'dashed',
          borderColor: dragging
            ? 'var(--cru-accent-garnet)'
            : status === 'success'
              ? 'rgba(45, 107, 69, 0.4)'
              : 'var(--cru-border)',
          background: dragging
            ? 'rgba(107, 25, 41, 0.04)'
            : 'var(--cru-surface)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {status === 'idle' && (
          <div className="space-y-2">
            <Upload className="h-6 w-6 mx-auto" style={{ color: 'var(--cru-text-muted)' }} />
            <p className="text-sm font-ui" style={{ color: 'var(--cru-text-muted)' }}>
              Drop your CellarTracker CSV here, or{' '}
              <span style={{ color: 'var(--cru-accent-gold)' }}>browse</span>
            </p>
            <p className="text-2xs font-ui" style={{ color: 'var(--cru-border)' }}>
              .csv files only
            </p>
          </div>
        )}

        {status === 'uploading' && (
          <div className="flex items-center justify-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cru-accent-garnet)' }} />
            <p className="text-sm font-ui" style={{ color: 'var(--cru-text-muted)' }}>
              Importing…
            </p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="h-6 w-6" style={{ color: '#4a7c59' }} />
            <p className="text-sm font-ui" style={{ color: 'var(--cru-text)' }}>
              Imported{' '}
              <span className="font-mono" style={{ color: '#4a7c59' }}>{result.imported}</span>{' '}
              bottles
              {result.errors > 0 && (
                <span style={{ color: 'var(--cru-text-muted)' }}>
                  , {result.errors} row{result.errors !== 1 ? 's' : ''} skipped
                </span>
              )}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-6 w-6" style={{ color: 'var(--cru-accent-garnet)' }} />
            <p className="text-sm font-ui" style={{ color: 'var(--cru-text-muted)' }}>
              Import failed. Please check the file format and try again.
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}
              className="text-xs font-ui underline text-cru-accent-garnet"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delete Account Confirmation ──────────────────────────────────────────────

function DeleteAccountButton() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const token = await getToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/api/v1/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 404) {
        throw new Error('Delete failed');
      }
      // Revoke Clerk session after DB record is gone
      await signOut();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        style={{ borderColor: 'var(--cru-accent-garnet)', color: 'var(--cru-accent-garnet)' }}
      >
        Delete Account
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-ui" style={{ color: 'var(--cru-text-muted)' }}>
        This is permanent and cannot be undone.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={deleting}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        style={{ background: 'var(--cru-accent-garnet)', borderColor: 'var(--cru-accent-garnet)' }}
      >
        {deleting ? 'Deleting…' : 'Yes, delete everything'}
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { user, isLoading, scoringSystem, refetch } = useCurrentUser();

  // Home country local state — initialized from backend, saved on change
  const [homeCountry, setHomeCountry] = useState<string>('');
  const [savingCountry, setSavingCountry] = useState(false);

  // Scoring system local state — initialized from backend, saved on change
  const [selectedScoring, setSelectedScoring] = useState<string>(scoringSystem);
  const [savingScoring, setSavingScoring] = useState(false);

  // Populate fields once backend data arrives
  useEffect(() => {
    if (user?.home_country) setHomeCountry(user.home_country);
  }, [user?.home_country]);

  useEffect(() => {
    setSelectedScoring(scoringSystem);
  }, [scoringSystem]);

  async function apiPut(body: Record<string, unknown>) {
    const token = await getToken();
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    const res = await fetch(`${API_BASE}/api/v1/me`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Save failed');
    await refetch();
  }

  async function handleScoringChange(value: string) {
    setSelectedScoring(value);
    setSavingScoring(true);
    try {
      await apiPut({ scoring_system: value });
    } finally {
      setSavingScoring(false);
    }
  }

  async function handleCountryChange(code: string) {
    setHomeCountry(code);
    setSavingCountry(true);
    try {
      await apiPut({ home_country: code || null });
    } finally {
      setSavingCountry(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header-rule flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl text-cru-text" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Settings</h1>
          <p className="mt-1.5 font-ui text-sm text-cru-text-muted">
            Your preferences and account configuration.
          </p>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-cru-text" style={{ fontWeight: 500 }}>Profile</h2>
        </CardHeader>
        <CardBody className="space-y-5">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            {clerkUser?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clerkUser.imageUrl}
                alt={clerkUser.fullName ?? 'User'}
                className="h-14 w-14 rounded-full object-cover ring-1 ring-cru-border"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-cru-surface-raised flex items-center justify-center ring-1 ring-cru-border">
                <span className="text-xl font-display text-cru-text-muted">
                  {(clerkUser?.fullName ?? 'U').charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="text-base font-display">{clerkUser?.fullName ?? '—'}</p>
              <p className="text-sm font-ui text-cru-text-muted">
                {clerkUser?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>

          {/* Home country */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
              Home Country
            </label>
            <div className="flex items-center gap-3">
              <select
                value={homeCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                disabled={isLoading || savingCountry}
                className="w-64 h-9 px-3 text-sm font-ui rounded border border-cru-border bg-cru-surface text-cru-text focus:outline-none focus:border-cru-accent-garnet disabled:opacity-50"
              >
                <option value="">— Not set —</option>
                <option disabled>──────────────</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              {savingCountry && (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin border-cru-accent-garnet" />
              )}
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs font-ui text-cru-text-muted mb-3">
              Name, email, and avatar are managed through Clerk.
            </p>
            <a
              href="/user-profile"
              className="inline-flex items-center gap-1.5 text-xs font-ui underline text-cru-accent-garnet"
            >
              Edit name &amp; avatar <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardBody>
      </Card>

      {/* Scoring system */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-cru-text" style={{ fontWeight: 500 }}>Scoring System</h2>
            {savingScoring && (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin border-cru-accent-garnet" />
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm font-body text-cru-text-muted">
            Choose how you score wines in your tasting notes.
          </p>
          <div className="space-y-2">
            {SCORING_SYSTEMS.map((sys) => (
              <label
                key={sys.value}
                className="flex items-start gap-3 p-3 rounded border border-cru-border hover:border-cru-accent-garnet/30 transition-colors cursor-pointer group"
              >
                <input
                  type="radio"
                  name="scoring_system"
                  value={sys.value}
                  checked={selectedScoring === sys.value}
                  onChange={() => handleScoringChange(sys.value)}
                  disabled={isLoading || savingScoring}
                  className="mt-0.5 accent-cru-accent-garnet"
                />
                <div>
                  <p className="text-sm font-ui text-cru-text">{sys.label}</p>
                  <p className="text-2xs font-ui text-cru-text-muted">
                    {sys.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-cru-text" style={{ fontWeight: 500 }}>Display</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Currency
              </label>
              <select className="w-full h-9 px-3 text-sm font-ui rounded border border-cru-border bg-cru-surface text-cru-text focus:outline-none focus:border-cru-accent-garnet">
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted">
                Temperature
              </label>
              <select className="w-full h-9 px-3 text-sm font-ui rounded border border-cru-border bg-cru-surface text-cru-text focus:outline-none focus:border-cru-accent-garnet">
                <option value="celsius">Celsius</option>
                <option value="fahrenheit">Fahrenheit</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-cru-text" style={{ fontWeight: 500 }}>Data &amp; Import</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <CellarTrackerImport />

          <div className="pt-2 border-t border-cru-border">
            <p className="text-sm font-body text-cru-text-muted mb-3">
              Export your data at any time.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                Export Cellar (CSV)
              </Button>
              <Button variant="outline" size="sm">
                Export Notes (JSON)
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-red-700" style={{ fontWeight: 500 }}>
            Danger Zone
          </h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm font-body text-cru-text-muted">
            Permanently delete your account, cellar, tasting notes, and all associated data.
            This action cannot be undone.
          </p>
          <DeleteAccountButton />
        </CardBody>
      </Card>
    </div>
  );
}
