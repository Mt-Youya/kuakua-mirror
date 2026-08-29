import React, { type ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"

interface CompanionDialogProps {
  children: ReactNode
  isOpen: boolean
  label: string
  onClose: () => void
  dismissible?: boolean
}

export const CompanionDialog: React.FC<CompanionDialogProps> = ({
  children,
  isOpen,
  label,
  onClose,
  dismissible = true,
}) => (
  <Dialog.Root
    open={isOpen}
    disablePointerDismissal={!dismissible}
    onOpenChange={(open) => {
      if (!open && dismissible) onClose()
    }}
  >
    <Dialog.Portal>
      <Dialog.Backdrop className="companion-dialog-backdrop" />
      <Dialog.Viewport className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
        <Dialog.Popup className="companion-dialog-popup w-full max-w-sm outline-none pointer-events-auto">
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  </Dialog.Root>
)
