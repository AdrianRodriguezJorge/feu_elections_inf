import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  let dbStatus: "connected" | "disconnected" = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    phase: "F2",
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
}

