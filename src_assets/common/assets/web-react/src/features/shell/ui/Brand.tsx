import { Link } from '@heroui/react';

/** Helios logo; links to the home page. */
export function Brand() {
  return (
    <Link href="./" data-testid="brand" className="flex items-center gap-3 no-underline">
      <img src="/images/logo-helios-45.png" alt="Helios" title="Helios" height={45} width={45} className="size-11" />
      <span className="text-lg font-semibold text-foreground">Helios</span>
    </Link>
  );
}
