// Textures dibuixades per codi en un <canvas>: no pesen, no tenen drets i surten iguals a cada visita
// (atzar amb llavor). Totes es creen dins de l'escena, que ja és al navegador.

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { seededRandom } from "@/lib/random";

type Draw = (ctx: CanvasRenderingContext2D, size: { w: number; h: number }, random: () => number) => void;

function make(w: number, h: number, seed: number, draw: Draw, repeat = true) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    try {
      draw(ctx, { w, h }, seededRandom(seed));
    } catch (error) {
      console.error("Textura no dibuixada del tot", error);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

const shade = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
};

/**
 * El plànol de la planta, en blau de plànol sobre transparent: murs gruixuts, envans, portes amb
 * l'arc d'obertura, la piscina, cotes amb les seves marques i la fletxa del nord. Escala: el canvas
 * cobreix 24 × 24 m centrats a l'origen, amb +x a la dreta i +z cap avall.
 */
export function planTexture() {
  return make(2048, 2048, 7, (ctx, { w }) => {
    const m = w / 24; // píxels per metre
    const X = (x: number) => (x + 12) * m;
    const Z = (z: number) => (z + 12) * m;
    const blue = "#0b62ad";
    ctx.strokeStyle = blue;
    ctx.fillStyle = blue;
    ctx.lineCap = "round";

    // Murs exteriors (doble línia amb farciment ratllat).
    const wall = (x1: number, z1: number, x2: number, z2: number) => {
      ctx.lineWidth = 0.28 * m;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(X(x1), Z(z1));
      ctx.lineTo(X(x2), Z(z2));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3;
      ctx.strokeRect(Math.min(X(x1), X(x2)) - 0.14 * m, Math.min(Z(z1), Z(z2)) - 0.14 * m, Math.abs(X(x2) - X(x1)) + 0.28 * m, Math.abs(Z(z2) - Z(z1)) + 0.28 * m);
    };
    wall(-6, -4, 3, -4);
    wall(-6, 2, 3, 2);
    wall(-6, -4, -6, 2);
    wall(3, -4, 7, -4);
    wall(7, -4, 7, 0.5);
    wall(3, 0.5, 7, 0.5);
    wall(3, 0.5, 3, 2);

    // Envans.
    ctx.lineWidth = 4;
    const line = (x1: number, z1: number, x2: number, z2: number) => {
      ctx.beginPath();
      ctx.moveTo(X(x1), Z(z1));
      ctx.lineTo(X(x2), Z(z2));
      ctx.stroke();
    };
    line(-2.6, -4, -2.6, -0.6);
    line(-6, -0.6, -3.6, -0.6);
    line(0.4, -4, 0.4, -1.4);
    line(3, -4, 3, -1.2);

    // Portes amb l'arc d'obertura.
    ctx.lineWidth = 2;
    const door = (x: number, z: number, r: number, from: number, to: number) => {
      ctx.beginPath();
      ctx.moveTo(X(x), Z(z));
      ctx.arc(X(x), Z(z), r * m, from, to);
      ctx.closePath();
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    door(-3.6, -0.6, 0.9, Math.PI, Math.PI * 1.5);
    door(0.4, -1.4, 0.85, Math.PI * 0.5, Math.PI);
    door(3, -1.2, 0.9, 0, Math.PI * 0.5);

    // Piscina i escala.
    ctx.lineWidth = 4;
    ctx.strokeRect(X(-4.5), Z(4), 7 * m, 3.5 * m);
    ctx.lineWidth = 2;
    ctx.strokeRect(X(-4.5) + 0.25 * m, Z(4) + 0.25 * m, 6.5 * m, 3 * m);
    for (let i = 0; i < 3; i++) line(-4.5 + 0.35 * (i + 1), 4.25, -4.5 + 0.35 * (i + 1), 5.4);

    // Terrassa (línia discontínua).
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 2;
    ctx.strokeRect(X(-7), Z(2), 15 * m, 7.5 * m);
    ctx.setLineDash([]);

    // Cotes.
    const font = `600 ${Math.round(0.42 * m)}px "Open Sans", system-ui, sans-serif`;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const tick = (x: number, z: number) => line(x - 0.18, z + 0.18, x + 0.18, z - 0.18);
    const dimH = (x1: number, x2: number, z: number, label: string) => {
      ctx.lineWidth = 2;
      line(x1, z, x2, z);
      tick(x1, z);
      tick(x2, z);
      ctx.fillText(label, X((x1 + x2) / 2), Z(z) - 6);
    };
    const dimV = (z1: number, z2: number, x: number, label: string) => {
      ctx.lineWidth = 2;
      line(x, z1, x, z2);
      tick(x, z1);
      tick(x, z2);
      ctx.save();
      ctx.translate(X(x) - 8, Z((z1 + z2) / 2));
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    };
    dimH(-6, 3, -5.3, "9,00");
    dimH(3, 7, -5.3, "4,00");
    dimV(-4, 2, -7.4, "6,00");
    dimH(-4.5, 2.5, 8.6, "7,00");
    dimV(4, 7.5, 3.6, "3,50");

    // Fletxa del nord.
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(X(9.5), Z(-8.5), 0.7 * m, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(9.5), Z(-9.3));
    ctx.lineTo(X(9.75), Z(-8.2));
    ctx.lineTo(X(9.5), Z(-8.45));
    ctx.lineTo(X(9.25), Z(-8.2));
    ctx.closePath();
    ctx.fill();
    ctx.fillText("N", X(9.5), Z(-9.4));

    // Caixetí.
    ctx.lineWidth = 3;
    ctx.strokeRect(X(5.2), Z(9.6), 5.4 * m, 1.6 * m);
    ctx.textAlign = "left";
    ctx.font = `800 ${Math.round(0.38 * m)}px "Schibsted Grotesk", system-ui, sans-serif`;
    ctx.fillText("ARENDA CONSTRUCCIONES", X(5.45), Z(10.25));
    ctx.font = font;
    ctx.fillText("PLANTA BAIXA · E 1:100", X(5.45), Z(10.95));
  }, false);
}

/** Teula àrab: fileres de canals amb ombra cilíndrica i variació de to de peça a peça. */
export function roofTileTexture() {
  return make(512, 512, 11, (ctx, { w, h }, random) => {
    const cols = 8;
    const rows = 6;
    const cw = w / cols;
    const rh = h / rows;
    ctx.fillStyle = "#6e2f17";
    ctx.fillRect(0, 0, w, h);
    const tones = ["#b4532a", "#c0612f", "#a84a26", "#c86b35", "#b85a2e", "#9e4423"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + (r % 2) * cw * 0.5;
        const y = r * rh;
        const base = tones[Math.floor(random() * tones.length)]!;
        for (const dx of [0, -w]) {
          const g = ctx.createLinearGradient(x + dx, 0, x + dx + cw, 0);
          g.addColorStop(0, shade(base, -0.14));
          g.addColorStop(0.42, shade(base, 0.08));
          g.addColorStop(0.6, base);
          g.addColorStop(1, shade(base, -0.2));
          ctx.fillStyle = g;
          ctx.beginPath();
          // `roundRect` no existeix a Safari < 16 ni a Firefox < 112.
          if (typeof ctx.roundRect === "function") ctx.roundRect(x + dx + 2, y + 2, cw - 4, rh * 1.1, [cw * 0.5, cw * 0.5, 4, 4]);
          else ctx.rect(x + dx + 2, y + 2, cw - 4, rh * 1.1);
          ctx.fill();
        }
      }
      // Ombra de la filera de sobre.
      ctx.fillStyle = "rgba(40, 14, 6, 0.28)";
      ctx.fillRect(0, (r + 1) * rh - 5, w, 5);
    }
  });
}

/** Paret de pedra en filades irregulars (com la xemeneia i els murs de les seves obres). */
export function stoneTexture() {
  return make(512, 512, 23, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#9b9186";
    ctx.fillRect(0, 0, w, h);
    const tones = ["#e6dccb", "#d8ccb8", "#cfc2ad", "#e9e1d3", "#c9bba4", "#ddd2c0"];
    let y = 0;
    while (y < h) {
      const rowH = 22 + random() * 26;
      let x = -random() * 40;
      while (x < w) {
        const len = 40 + random() * 90;
        ctx.fillStyle = tones[Math.floor(random() * tones.length)]!;
        ctx.fillRect(x + 2, y + 2, len - 4, rowH - 4);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x + 2, y + 2, len - 4, 3);
        ctx.fillStyle = "rgba(60,45,30,0.14)";
        ctx.fillRect(x + 2, y + rowH - 6, len - 4, 4);
        x += len;
      }
      y += rowH;
    }
  });
}

/** Bloc ceràmic de tancament (termoargila), el que es veu abans d'arrebossar. */
export function brickTexture() {
  return make(512, 512, 31, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#b9aa98";
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    const bw = w / 3;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < 4; c++) {
        const x = c * bw + (r % 2) * bw * 0.5;
        const tone = 0.42 + random() * 0.1;
        ctx.fillStyle = `hsl(18, 52%, ${tone * 100}%)`;
        ctx.fillRect(x + 3, r * rh + 3, bw - 6, rh - 6);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        for (let k = 1; k < 6; k++) ctx.fillRect(x + 3 + ((bw - 6) * k) / 6, r * rh + 8, 2, rh - 16);
      }
    }
  });
}

/** Rajola petita de bany dels noranta, amb la junta grisa. Una peça de 2 × 2 rajoles. */
export function oldTileTexture() {
  return make(256, 256, 41, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#9aa3a3";
    ctx.fillRect(0, 0, w, h);
    const n = 2;
    const s = w / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const g = ctx.createLinearGradient(c * s, r * s, (c + 1) * s, (r + 1) * s);
        const l = 86 + random() * 4;
        g.addColorStop(0, `hsl(190, 28%, ${l}%)`);
        g.addColorStop(1, `hsl(190, 24%, ${l - 6}%)`);
        ctx.fillStyle = g;
        ctx.fillRect(c * s + 3, r * s + 3, s - 6, s - 6);
      }
    }
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h * 0.4);
    ctx.globalAlpha = 1;
    void h;
  });
}

/** Terra vell: rajola de gres marró amb vores fosques. */
export function oldFloorTexture() {
  return make(256, 256, 43, (ctx, { w }, random) => {
    ctx.fillStyle = "#5a3d2c";
    ctx.fillRect(0, 0, w, w);
    const s = w / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = `hsl(22, 38%, ${36 + random() * 6}%)`;
        ctx.fillRect(c * s + 3, r * s + 3, s - 6, s - 6);
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = `rgba(30,15,5,${0.05 + random() * 0.08})`;
          ctx.fillRect(c * s + random() * s, r * s + random() * s, 3 + random() * 8, 2 + random() * 4);
        }
      }
    }
  });
}

/** Paret desnuda després de l'enderroc: morter gris amb restes i taques. */
export function bareWallTexture() {
  return make(512, 512, 47, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#a59b8f";
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) {
      const l = 50 + random() * 22;
      ctx.fillStyle = `hsla(30, 10%, ${l}%, ${0.25 + random() * 0.4})`;
      ctx.fillRect(random() * w, random() * h, 2 + random() * 10, 2 + random() * 6);
    }
    ctx.strokeStyle = "rgba(70,60,50,0.25)";
    ctx.lineWidth = 2;
    for (let r = 1; r < 8; r++) {
      ctx.beginPath();
      ctx.moveTo(0, (r * h) / 8 + random() * 4);
      ctx.lineTo(w, (r * h) / 8 + random() * 4);
      ctx.stroke();
    }
  });
}

/** Microciment: to càlid, net, amb les passades de la llana. */
export function microcementTexture() {
  return make(512, 512, 53, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#d9d1c5";
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 160; k++) {
      const x = random() * w;
      const y = random() * h;
      const r = 30 + random() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const light = random() > 0.5;
      g.addColorStop(0, light ? "rgba(255,255,255,0.05)" : "rgba(120,100,80,0.035)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.35, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Mosaic de còdols de riu, com la paret del bany de la foto. */
export function pebbleTexture() {
  return make(512, 512, 59, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#cfc5b6";
    ctx.fillRect(0, 0, w, h);
    const tones = ["#efe8dc", "#e4dacb", "#d9cdb9", "#f3eee6", "#e0d4c2", "#cbbfac"];
    for (let k = 0; k < 520; k++) {
      const x = random() * w;
      const y = random() * h;
      const rx = 8 + random() * 14;
      const ry = 6 + random() * 10;
      ctx.fillStyle = tones[Math.floor(random() * tones.length)]!;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]] as const) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, rx, ry, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/** Fusta de roure clar amb la veta horitzontal (el moble suspès). */
export function oakTexture() {
  return make(512, 256, 61, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#c39567";
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 70; k++) {
      ctx.strokeStyle = `rgba(${random() > 0.5 ? "120,80,45" : "225,190,150"},${0.12 + random() * 0.18})`;
      ctx.lineWidth = 1 + random() * 3;
      const y = random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + k) * 3);
      ctx.stroke();
    }
  });
}

/** Lloses de pedra calcària de la terrassa: un sol to amb taques suaus. */
export function limestoneTexture() {
  return make(256, 256, 67, (ctx, { w, h }, random) => {
    ctx.fillStyle = "#e7dccb";
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 260; k++) {
      ctx.fillStyle = `rgba(${random() > 0.5 ? "255,255,255" : "150,125,95"},${0.04 + random() * 0.06})`;
      ctx.beginPath();
      ctx.arc(random() * w, random() * h, 1 + random() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Ombra difusa pintada una vegada (en lloc de ContactShadows, que re-renderitza a cada fotograma). */
export function blobShadowTexture() {
  return make(128, 128, 1, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(30,24,20,0.45)");
    g.addColorStop(1, "rgba(30,24,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }, false);
}
