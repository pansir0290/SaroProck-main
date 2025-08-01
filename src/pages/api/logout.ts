// src/pages/api/logout.ts
import { clearAuthCookie } from "@/lib/auth";

export async function POST(): Promise<Response> {
  const response = new Response(
    JSON.stringify({ success: true, message: "Logged out successfully" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

  // 清除 HttpOnly cookie
  clearAuthCookie(response);

  return response;
}
