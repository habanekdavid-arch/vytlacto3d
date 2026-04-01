import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Safe session fallback:", error);
    return null;
  }
}