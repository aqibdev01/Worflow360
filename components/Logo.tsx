import Image from "next/image";

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <Image
      src="/work.png"
      alt="Workflow360 Logo"
      width={48}
      height={48}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
