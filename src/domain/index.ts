/**
 * Barrel del dominio.
 *
 * Todo el dominio electoral es puro y vive aquí. Los tests de `tests/` lo
 * cubren sin base de datos ni servidor.
 */

export * from "./types";
export * from "./seats";
export * from "./ballot";
export * from "./quorum";
export * from "./tally";
export * from "./states";
export * from "./ci";
export * from "./padron";
export * from "./commission";
export * from "./permissions";
export * from "./auth";
export * from "./candidates";
export * from "./config";
