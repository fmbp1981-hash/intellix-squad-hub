interface BrandLogoProps {
  variant?: 'compact' | 'full'
  className?: string
}

export function BrandLogo({ variant = 'full', className }: BrandLogoProps) {
  if (variant === 'compact') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/intellix-logo.png"
        alt="IntelliX.AI"
        width={40}
        height={40}
        className={`object-contain${className ? ` ${className}` : ''}`}
      />
    )
  }

  return (
    <div className={`flex items-center gap-3${className ? ` ${className}` : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/intellix-logo.png"
        alt="IntelliX.AI"
        width={80}
        height={80}
        className="object-contain shrink-0"
      />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-sm font-semibold text-foreground">
          IntelliX Squad Hub
        </span>
        <span className="text-[11px] text-muted-foreground">
          IntelliX.AI · Consultoria Inteligente
        </span>
      </div>
    </div>
  )
}
