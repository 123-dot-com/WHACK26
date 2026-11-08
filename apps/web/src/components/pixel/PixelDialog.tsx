import { useEffect, useRef, type ReactNode } from "react";

export default function PixelDialog({ label, onClose, children, className = "", modal = true }: {
  label: string; onClose: () => void; children: ReactNode; className?: string; modal?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (modal) dialog.showModal(); else dialog.show();
    return () => { dialog.close(); };
  }, [modal]);
  useEffect(() => {
    if (modal) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [modal, onClose]);
  return <dialog className={`pixel-dialog ${!modal ? "pixel-dialog--modeless" : ""} ${className}`} ref={ref} aria-label={label} aria-modal={modal}
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    {children}
  </dialog>;
}
