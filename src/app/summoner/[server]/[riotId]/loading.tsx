export default function Loading() {
  return (
    <div className="pt-6">
      <div className="skeleton mb-5 h-36 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
          <div className="skeleton h-64" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
