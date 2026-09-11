"use client";

import {useEffect} from "react";
import {attachGlobalClickSounds} from "@/lib/clickSound";

/** Plays a random mouse-click on buttons, links, and amount controls. */
export function ClickSoundProvider() {
  useEffect(() => attachGlobalClickSounds(), []);
  return null;
}
