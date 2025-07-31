/// <reference types="vite/client" />

// Fix for missing 'long' type definition
declare module 'long' {
  interface Long {
    high: number;
    low: number;
    unsigned: boolean;
  }
  export = Long;
}