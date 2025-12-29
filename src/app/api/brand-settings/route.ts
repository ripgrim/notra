import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db/drizzle";
import { brandSettings } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const settings = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, organizationId),
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Brand settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching brand settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
