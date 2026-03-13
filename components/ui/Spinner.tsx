export default function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div
      className={`animate-spin ${dim} border-2 border-melon-green border-t-transparent rounded-full`}
    />
  );
}
