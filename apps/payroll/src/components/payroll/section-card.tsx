interface SectionCardProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({
  eyebrow,
  title,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="section-heading uppercase">{title}</h2>
          {eyebrow ? (
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              {eyebrow}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
