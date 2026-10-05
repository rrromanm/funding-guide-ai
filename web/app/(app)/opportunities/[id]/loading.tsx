export default function OpportunityDetailsLoading() {
  return (
    <div className="space-y-6 p-8" role="status" aria-label="Loading funding opportunity">
      <div className="h-24 animate-pulse rounded-[20px] bg-white shadow-card" />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="h-[520px] animate-pulse rounded-[20px] bg-white shadow-card" />
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-[20px] bg-white shadow-card" />
          <div className="h-56 animate-pulse rounded-[20px] bg-white shadow-card" />
        </div>
      </div>
    </div>
  );
}