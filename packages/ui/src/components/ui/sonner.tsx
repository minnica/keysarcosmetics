"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

// Verde olive (#648672) y sage (#8bb09b) de la paleta de marca Keysar
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        style: {
          background: '#648672',
          color: '#ffffff',
          border: '1px solid #8bb09b',
          boxShadow: '0 4px 12px rgba(100, 134, 114, 0.25)',
        },
        classNames: {
          description: "opacity-80",
          actionButton: "!bg-white/20 !text-white hover:!bg-white/30",
          cancelButton: "!bg-white/15 !text-white hover:!bg-white/25",
          closeButton: "!bg-white/20 !text-white !border-white/20 hover:!bg-white/30",
          icon: "[&_svg]:!text-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
