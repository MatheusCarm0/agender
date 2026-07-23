import Image from "next/image";

import logoLight from "../images/agender-logo-transp-light.svg";
import logoDark from "../images/agender-logo-transp-dark.svg";

type TypeColor = "light" | "dark";

interface AgenderLogoProps {
  color?: TypeColor;
  width?: number;
  height?: number;
  className?: string;
}

export function AgenderLogo({
  color = "light",
  width = 120,
  height = 40,
  className,
}: AgenderLogoProps) {
  return (
    <Image
      src={color === "dark" ? logoDark : logoLight}
      alt="Logo Agender"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}