import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: "USer not found" }, { status: 401 });
    }

    const subscriptionEnds = new Date();
    subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);

    const updateUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isSubscribed: true,
        subscriptionEnds: subscriptionEnds,
      },
    });

    return NextResponse.json({
      message: "Subcrition Successful",
      subscriptionEnds: updateUser.subscriptionEnds,
    });
  } catch (err) {
    console.error("Error updating subcription", err);
    return NextResponse.json(
      { error: "Internal Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSubcribed: true,
        subscriprtionEnds: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "USer not found" }, { status: 401 });
    }

    const now = new Date();
    if (user.issubscriptionEnds && user.subscriptionEnds < now) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isSubscribed: false,
          subscriptionEnds: null,
        },
      });
      return NextResponse.json({
        isSubcribed: false,
        subscriptionEnds: null,
      });
    }
    return NextResponse.json({
      isSubscribed: user.isSubcribed,
      subscriptionEnds: user.subscriptionEnds,
    });
  } catch (err) {
    console.error("Error updating subcription", err);
    return NextResponse.json(
      { error: "Internal Server error" },
      { status: 500 }
    );
  }
}
