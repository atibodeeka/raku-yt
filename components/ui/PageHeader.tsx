import { type IconType } from "react-icons";

interface PageHeaderProps {
  icon: IconType;
  title: string;
  subtitle?: string;
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1
        className="text-lg font-bold text-gray-800 flex items-center gap-2"
        style={{ fontFamily: "var(--font-round)" }}>
        <Icon className="text-melon-green" />
        {title}
      </h1>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
