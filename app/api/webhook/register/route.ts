import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { error, log } from "console";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add webhook in env");
  }

  const headerPayload = headers();
  const svix_id = (await headerPayload).get("svix_id");
  const svix_timestamp = (await headerPayload).get("svix_timestamp");
  const svix_signature = (await headerPayload).get("svix_signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occoured -No Svix headers");
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      svix_id: svix_id,
      svix_timestamp: svix_timestamp,
      svix_signature: svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying wbhook", err);
    return new Response("error occr", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );
      if (!primaryEmail) {
        return new Response("No primary email found", { status: 400 });
      }

      await prisma.user.create({
        data: {
          id: evt.data.id!,
          email: primaryEmail.email_address,
          isSubcribed: false,
        },
      });
    } catch (error) {
      return new Response("error in db", { status: 401 });
    }
  }

  return new Response("Recieved webhook successfully", { status: 200 });
}
