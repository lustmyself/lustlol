"use client";

import { useEffect } from "react";
import { pushRecent } from "../SearchBox";

export function RememberSearch(props: { name: string; tag: string; server: string; profileIconId: number }) {
  const { name, tag, server, profileIconId } = props;
  useEffect(() => pushRecent({ name, tag, server, profileIconId }), [name, tag, server, profileIconId]);
  return null;
}
