type SkipLinkProps = {
  href?: string;
  label?: string;
};

export function SkipLink({
  href = "#main-content",
  label = "Skip to main content",
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only fixed top-3 left-3 z-[100] min-h-11 min-w-11 items-center rounded-lg bg-background px-3 py-2 text-sm font-medium text-foreground shadow-lg outline-none focus:not-sr-only focus:flex focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
    </a>
  );
}
