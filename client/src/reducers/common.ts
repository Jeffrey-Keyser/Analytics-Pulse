export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function makeStandardHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

// Global PayAuth instance reference
let globalPayAuthInstance: any = null;

export function setGlobalPayAuthInstance(instance: any) {
  globalPayAuthInstance = instance;
}
