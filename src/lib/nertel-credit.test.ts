import { describe, expect, it } from "vitest";
import { nertelCreditUrl } from "./nertel-credit";

// La franja «Web feta per Nertel» porta a nertel.ai en l'idioma de la pàgina, i marca d'on ve la
// visita perquè a l'analítica de nertel.ai es vegi quines webs de clients ens envien gent.
describe("enllaç de crèdit a Nertel", () => {
  it("porta a nertel.ai en l'idioma de la pàgina (els tres hi són)", () => {
    expect(new URL(nertelCreditUrl("ca")).pathname).toBe("/ca");
    expect(new URL(nertelCreditUrl("es")).pathname).toBe("/es");
    expect(new URL(nertelCreditUrl("en")).pathname).toBe("/en");
    expect(new URL(nertelCreditUrl("es")).origin).toBe("https://nertel.ai");
  });

  it("diu que la visita ve del peu de la web d'Arenda", () => {
    const params = new URL(nertelCreditUrl("ca")).searchParams;
    expect(params.get("utm_source")).toBe("arenda-construcciones-web.vercel.app");
    expect(params.get("utm_medium")).toBe("credit");
  });
});
