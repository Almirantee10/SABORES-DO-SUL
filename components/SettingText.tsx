"use client";

import { useCatalog } from "@/components/Catalog";
import type { Settings } from "@/lib/store-data";

/** A text the shop owner can change in the admin panel (Loja → Textos). */
export function SettingText({ k }: { k: { [K in keyof Settings]: Settings[K] extends string ? K : never }[keyof Settings] }) {
  const { settings } = useCatalog();
  return <>{settings[k]}</>;
}
