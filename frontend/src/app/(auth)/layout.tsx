export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cru-bg px-4 py-12">
      <div className="mb-10 text-center">
        <span
          className="font-display text-5xl italic"
          style={{ color: 'var(--cru-accent-garnet)', letterSpacing: '-0.02em', fontWeight: 500 }}
        >
          Cru
        </span>
        <p className="mt-1.5 font-ui text-xs uppercase tracking-[0.18em] text-cru-text-subtle">
          Personal Wine Intelligence
        </p>
      </div>

      {children}

      <p className="mt-10 font-ui text-xs text-cru-text-subtle">Private. For serious drinkers.</p>
    </div>
  );
}
