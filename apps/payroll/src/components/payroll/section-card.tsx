interface SectionCardProps {
  eyebrow?: string
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SectionCard({ eyebrow, title, action, children }: SectionCardProps) {
  return (
    <div className="payroll-login-card overflow-hidden rounded-[2rem]">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? <p className="label-caps mb-2">{eyebrow}</p> : null}
          <h3 className="section-heading">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  )
}
