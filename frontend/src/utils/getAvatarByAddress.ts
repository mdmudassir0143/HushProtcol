import {isAddress} from "viem";
import {avatarBgColors, avatars, type AvatarChoice} from "@/data/avatarConstants";
import {getRandomAvatar} from "@/utils/getRandomAvatar";

/**
 * Deterministic avatar for an EVM address.
 * First 4 hex → background color, last 4 hex → character.
 */
export function getAvatarByAddress(address?: string | null): AvatarChoice {
  if (!address || !isAddress(address)) return getRandomAvatar();

  const trimmed = address.slice(2);
  const firstDecimal = parseInt(trimmed.slice(0, 4), 16);
  const lastDecimal = parseInt(trimmed.slice(-4), 16);
  const max = 0xffff;

  const bgColorIndex = Math.min(
    avatarBgColors.length - 1,
    Math.floor((firstDecimal / max) * avatarBgColors.length)
  );
  const avatarIndex = Math.min(
    avatars.length - 1,
    Math.floor((lastDecimal / max) * avatars.length)
  );

  const bgColor = avatarBgColors[bgColorIndex]!;
  const avatar = avatars[avatarIndex]!;

  return {avatarImage: avatar.url, bgColor, name: avatar.name};
}

export default getAvatarByAddress;
