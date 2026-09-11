"use client";

import {getAvatarByAddress} from "@/utils/getAvatarByAddress";

export function UserAvatar({
  address,
  size = "md",
  className = "",
  showName = false,
}: {
  address?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  showName?: boolean;
}) {
  const {avatarImage, bgColor, name} = getAvatarByAddress(address);

  const dim =
    size === "sm"
      ? "h-7 w-7"
      : size === "lg"
        ? "h-20 w-20 sm:h-24 sm:w-24"
        : "h-14 w-14";

  return (
    <div
      className={`inline-flex items-center ${
        showName ? "flex-col gap-1.5" : ""
      } ${className}`}
    >
      <div
        className={`overflow-hidden rounded-full border border-fog/80 ${dim}`}
        style={{backgroundColor: bgColor}}
        title={name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarImage}
          alt=""
          className="h-full w-full object-cover"
          aria-hidden
        />
      </div>
      {showName ? (
        <p className="font-mono text-[10px] uppercase tracking-wide text-graphite">
          {name}
        </p>
      ) : null}
    </div>
  );
}
