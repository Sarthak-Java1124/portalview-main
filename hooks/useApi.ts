"use client";

import { useApiContext } from "@/context/ApiContext";

export function useApi() {
  return useApiContext();
}
