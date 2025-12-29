import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { redis } from "@/lib/redis";

type CrawlerStep = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  error?: string;
};

type CrawlerStatus = {
  status: "idle" | "crawling" | "completed" | "error";
  currentStep: string | null;
  steps: CrawlerStep[];
  error: string | null;
  workflowRunId: string | null;
};

const DEFAULT_STEPS: CrawlerStep[] = [
  {
    id: "validate",
    name: "Validating URL",
    description: "Checking if the website is accessible",
    status: "pending",
  },
  {
    id: "crawl",
    name: "Crawling Website",
    description: "Fetching and analyzing website content",
    status: "pending",
  },
  {
    id: "analyze",
    name: "Analyzing Brand",
    description: "AI is analyzing your brand identity",
    status: "pending",
  },
  {
    id: "save",
    name: "Saving Results",
    description: "Storing your brand profile",
    status: "pending",
  },
];

export async function POST(request: NextRequest) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, websiteUrl } = body;

    if (!organizationId || !websiteUrl) {
      return NextResponse.json(
        { error: "Organization ID and website URL are required" },
        { status: 400 }
      );
    }

    const lockKey = `brand-crawler:${organizationId}:lock`;
    const existingLock = await redis.get(lockKey);

    if (existingLock) {
      return NextResponse.json(
        { error: "A crawl is already in progress for this organization" },
        { status: 409 }
      );
    }

    await redis.set(lockKey, "locked", { ex: 300 });

    const workflowRunId = nanoid(16);
    const statusKey = `brand-crawler:${organizationId}:status`;

    const initialStatus: CrawlerStatus = {
      status: "crawling",
      currentStep: "validate",
      steps: DEFAULT_STEPS.map((step, index) =>
        index === 0 ? { ...step, status: "in_progress" as const } : step
      ),
      error: null,
      workflowRunId,
    };

    await redis.set(statusKey, initialStatus, { ex: 300 });

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    fetch(`${baseUrl}/api/brand-settings/crawl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ organizationId, websiteUrl }),
    }).catch((error) => {
      console.error("Error triggering workflow:", error);
    });

    return NextResponse.json({ workflowRunId });
  } catch (error) {
    console.error("Error starting crawler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
