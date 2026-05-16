import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email-welcome";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();

    const accountType = body.accountType === "COMPANY" ? "COMPANY" : "PERSON";
    const vatPayer = Boolean(body.vatPayer);

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Meno, email a heslo sú povinné." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Telefónne číslo je povinné." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Heslo musí mať minimálne 6 znakov." },
        { status: 400 }
      );
    }

    if (accountType === "COMPANY") {
      if (!body.companyName || !body.ico || !body.contactPerson) {
        return NextResponse.json(
          {
            error:
              "Pri firemnom účte vyplňte názov firmy, IČO a kontaktnú osobu.",
          },
          { status: 400 }
        );
      }

      if (vatPayer && !body.icDph) {
        return NextResponse.json(
          { error: "Ak ste platca DPH, vyplňte IČ DPH." },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Používateľ s týmto emailom už existuje." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,

        accountType,
        vatPayer,

        companyName: body.companyName || null,
        ico: body.ico || null,
        dic: body.dic || null,
        icDph: vatPayer ? body.icDph || null : null,
        contactPerson: body.contactPerson || null,

        billingStreet: body.billingStreet || null,
        billingCity: body.billingCity || null,
        billingZip: body.billingZip || null,
        billingCountry: body.billingCountry || "Slovensko",

        shippingName: body.shippingName || null,
        shippingContact: body.shippingContact || null,
        shippingStreet: body.shippingStreet || null,
        shippingCity: body.shippingCity || null,
        shippingZip: body.shippingZip || null,
        shippingCountry: body.shippingCountry || "Slovensko",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    try {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
      });
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error: any) {
    console.error("register error:", error);

    return NextResponse.json(
      { error: error?.message || "Registrácia zlyhala." },
      { status: 500 }
    );
  }
}