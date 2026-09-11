import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {ProfilePage} from "@/components/ProfilePage";
import {
  isReservedPath,
  normalizeUsernameParam,
} from "@/lib/routes";

type Props = {params: Promise<{username: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {username: raw} = await params;
  const username = normalizeUsernameParam(raw);
  if (!username || isReservedPath(username)) {
    return {title: "Not found · Hushh Protocol"};
  }
  return {title: `@${username} · Hushh Protocol`};
}

export default async function UsernameProfilePage({params}: Props) {
  const {username: raw} = await params;
  const username = normalizeUsernameParam(raw);
  if (!username || isReservedPath(username)) notFound();
  return <ProfilePage username={username} />;
}
