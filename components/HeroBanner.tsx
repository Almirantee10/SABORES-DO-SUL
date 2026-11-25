"use client";

import { photo } from "@/lib/data";
import { ParallaxBg } from "@/components/Motion";
import { useCatalog } from "@/components/Catalog";

/** Home page banner: the shop's own photo when one was sent in the admin panel, else the one shipped with the site. */
export function HeroBanner() {
  const { settings } = useCatalog();
  return (
    <ParallaxBg
      src={settings.banner || photo("hero-salgados")}
      overlay="linear-gradient(180deg,rgba(21,13,12,.1) 0%,rgba(21,13,12,.58) 50%,rgba(21,13,12,.9) 100%)"
      amount={10}
      zoom={false}
      className={settings.banner ? undefined : "hero-bg-food"}
    />
  );
}
