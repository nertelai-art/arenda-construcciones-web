import type { NextFetchEvent, NextRequest } from "next/server";
import { demoGate } from "@/demo-kit/gate";

// La web és una demo per a un lead: només s'hi entra amb un enllaç personal (vegeu `src/demo-kit`).
export function proxy(request: NextRequest, event: NextFetchEvent) {
  return demoGate(request, event);
}

// Literal: Next el llegeix sense executar el fitxer. És el `demoMatcher` del kit, més la icona en PNG
// i `og.jpg`, perquè WhatsApp ensenyi la vista prèvia de l'enllaç.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon|robots\\.txt|og\\.jpg|opengraph-image|twitter-image).*)"],
};
