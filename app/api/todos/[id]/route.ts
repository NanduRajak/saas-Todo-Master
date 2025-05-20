import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { error } from "console";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const todoId = params.id;

    const todo = await prisma.todo.findUnique({
      where: { od: todoId },
    });

    if (!todo) {
      return NextResponse.json(
        {
          error: "Todo not found",
        },
        {
          status: 401,
        }
      );
    }
    if (todo.userId !== userId) {
      return NextResponse.json(
        {
          error: "forbiden",
        },
        {
          status: 403,
        }
      );
    }
    await prisma.todo.delete({
      where: { id: todoId },
    });
    return NextResponse.json(
      { message: "todo deleted successfully" },
      { status: 403 }
    );
  } catch (err) {
    console.error("Enter updating subscription", err);
    return NextResponse.json(
      { error: "Internal Server problem" },
      { status: 500 }
    );
  }
}
