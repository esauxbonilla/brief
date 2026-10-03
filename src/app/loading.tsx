// Shown instantly while the server fetches the session and pieces, so the
// app never opens to a blank screen.
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface" role="status" aria-label="Cargando">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={56} height={56} className="animate-pulse rounded-[14px]" />
    </div>
  );
}
