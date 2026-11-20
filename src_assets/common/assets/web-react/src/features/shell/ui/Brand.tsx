import { Link } from '@heroui/react';

/** Helios logo; links to the home page. `compact` shows only the logo. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="./" data-testid="brand" className="flex items-center gap-3 no-underline">
      <img
        src="/images/logo-helios-45.png"
        alt="Helios"
        title="Helios"
        height={45}
        width={45}
        className="size-9 shrink-0"
      />
      {!compact && <span className="text-lg font-semibold tracking-tight text-foreground">Helios</span>}
    </Link>
  );
}
