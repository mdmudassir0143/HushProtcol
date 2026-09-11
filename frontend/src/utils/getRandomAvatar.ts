import {avatarBgColors, avatars, type AvatarChoice} from "@/data/avatarConstants";

/** Pick a random avatar + background. Used when no wallet is available. */
export function getRandomAvatar(): AvatarChoice {
  const bgColor =
    avatarBgColors[Math.floor(Math.random() * avatarBgColors.length)]!;
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]!;
  return {avatarImage: avatar.url, bgColor, name: avatar.name};
}

export default getRandomAvatar;
