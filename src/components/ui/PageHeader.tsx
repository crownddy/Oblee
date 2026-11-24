import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function PageHeader({
  title,
  backHref,
  variant = "back",
}: {
  title: string;
  backHref: string;
  variant?: "back" | "close";
}) {
  return (
    <div className="ch">
      <Link href={backHref} aria-label={variant === "close" ? "Close" : "Back"}>
        <Icon name={variant === "close" ? "close" : "back"} size={22} />
      </Link>
      <span>{title}</span>
      <span style={{ width: 40 }} />
    </div>
  );
}
