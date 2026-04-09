export default function Loading() {
  return (
    <div className="page-wrap min-h-screen flex items-center justify-center px-6">
      <div className="surface-card-strong w-full max-w-md rounded-[2rem] px-8 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          Loading
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Preparing the next step in the partner portal.
        </p>
      </div>
    </div>
  )
}
