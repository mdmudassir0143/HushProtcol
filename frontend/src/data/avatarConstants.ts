export const avatars = [
  {name: "Chiikawa", url: "/images/chiikawa.webp"},
  {name: "Hachi", url: "/images/hachi.webp"},
  {name: "Kuri", url: "/images/kuri.webp"},
  {name: "Momo", url: "/images/momo.webp"},
  {name: "Shisa", url: "/images/shisa.webp"},
  {name: "Usagi", url: "/images/usagi.webp"},
] as const;

export const avatarBgColors = [
  "#FFC0CB",
  "#FFA07A",
  "#FFD700",
  "#FF69B4",
  "#FF6347",
  "#FF4500",
] as const;

export type AvatarChoice = {
  avatarImage: string;
  bgColor: string;
  name: string;
};
