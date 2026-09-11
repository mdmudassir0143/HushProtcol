const HUSH_HANDLE = "@hushhprotocol";

export type PaymentShareKind = "sent" | "claimed";

export type PaymentShareDetails = {
  kind?: PaymentShareKind;
  fromUsername: string;
  toLabel: string;
  amount: number | string;
  tokenSymbol: string;
  tokenLogo?: string;
};

function shareKind(d: PaymentShareDetails): PaymentShareKind {
  return d.kind ?? "sent";
}

function fromDisplay(d: PaymentShareDetails): string {
  if (d.fromUsername) return `@${d.fromUsername.replace(/^@/, "")}`;
  return shareKind(d) === "claimed" ? "Private" : "—";
}

function eyebrowLabel(d: PaymentShareDetails): string {
  return shareKind(d) === "claimed" ? "PAYMENT CLAIMED" : "PAYMENT SENT";
}

/** Prefill text for X / Twitter share intent. */
export function paymentShareTweetText(d: PaymentShareDetails): string {
  const from = fromDisplay(d);
  const to = d.toLabel;
  if (shareKind(d) === "claimed") {
    return [
      `Claimed ${d.amount} ${d.tokenSymbol} privately on ${HUSH_HANDLE}`,
      "",
      `${from} → ${to}`,
      "",
      "Private by design on Arc. #HushhProtocol #Arc",
    ].join("\n");
  }
  return [
    `Sent ${d.amount} ${d.tokenSymbol} silently on ${HUSH_HANDLE}`,
    "",
    `${from} → ${to}`,
    "",
    "Private by design on Arc. #HushhProtocol #Arc",
  ].join("\n");
}

export function twitterIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed_image:${src}`));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Render a square share card (1080×1080) as PNG blob. */
export async function renderPaymentSharePng(
  d: PaymentShareDetails
): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const [logo, arcLogo, tokenImg] = await Promise.all([
    loadImage("/logomark.png").catch(() => null),
    loadImage("/arc-logo.png").catch(() => null),
    d.tokenLogo ? loadImage(d.tokenLogo).catch(() => null) : Promise.resolve(null),
  ]);

  // Background
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#f7f5f1");
  bg.addColorStop(0.55, "#ffffff");
  bg.addColorStop(1, "#efeae4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Soft signal glow
  const glow = ctx.createRadialGradient(820, 200, 40, 820, 200, 420);
  glow.addColorStop(0, "rgba(0, 166, 118, 0.18)");
  glow.addColorStop(1, "rgba(0, 166, 118, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Card panel
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 72, 96, size - 144, size - 192, 48);
  ctx.fill();
  ctx.strokeStyle = "rgba(10, 10, 10, 0.08)";
  ctx.lineWidth = 2;
  roundRect(ctx, 72, 96, size - 144, size - 192, 48);
  ctx.stroke();

  // Brand row — Hushh + Arc
  if (logo) {
    ctx.drawImage(logo, 120, 140, 72, 72);
  } else {
    ctx.fillStyle = "#0a0a0a";
    roundRect(ctx, 120, 140, 72, 72, 18);
    ctx.fill();
  }
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "700 42px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Hushh Protocol", 214, 188);
  ctx.fillStyle = "#6b6b6b";
  ctx.font = "500 28px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(HUSH_HANDLE, 214, 228);

  if (arcLogo) {
    const arcSize = 64;
    const arcX = size - 120 - arcSize;
    const arcY = 146;
    ctx.save();
    roundRect(ctx, arcX, arcY, arcSize, arcSize, 16);
    ctx.clip();
    ctx.drawImage(arcLogo, arcX, arcY, arcSize, arcSize);
    ctx.restore();
    ctx.fillStyle = "#6b6b6b";
    ctx.font =
      "600 20px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
    const arcLabel = "Arc";
    const labelW = ctx.measureText(arcLabel).width;
    ctx.fillText(arcLabel, arcX + (arcSize - labelW) / 2, arcY + arcSize + 28);
  }

  // Eyebrow
  ctx.fillStyle = "#6b6b6b";
  ctx.font =
    "600 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  ctx.fillText(eyebrowLabel(d), 120, 320);

  // Amount
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "800 120px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  const amountStr = String(d.amount);
  ctx.fillText(amountStr, 120, 460);
  const amountWidth = ctx.measureText(amountStr).width;
  ctx.fillStyle = "#6b6b6b";
  ctx.font = "700 48px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(d.tokenSymbol, 120 + amountWidth + 24, 448);
  const symbolWidth = ctx.measureText(d.tokenSymbol).width;

  if (tokenImg) {
    const cx = 120 + amountWidth + 24 + symbolWidth + 40;
    const cy = 432;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(tokenImg, cx - 22, cy - 22, 44, 44);
    ctx.restore();
  }

  // Divider
  ctx.strokeStyle = "rgba(10, 10, 10, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 520);
  ctx.lineTo(size - 120, 520);
  ctx.stroke();

  // From → To
  const from = fromDisplay(d);
  ctx.fillStyle = "#6b6b6b";
  ctx.font = "600 24px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("FROM", 120, 590);
  ctx.fillText("TO", 120, 720);

  ctx.fillStyle = "#0a0a0a";
  ctx.font = "700 44px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(from, 120, 650);
  ctx.fillText(d.toLabel, 120, 780);

  // Arrow hint between
  ctx.fillStyle = "#00a676";
  ctx.font = "700 36px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("→", size - 200, 720);

  // Footer
  ctx.fillStyle = "#6b6b6b";
  ctx.font = "500 26px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("send silently. · on Arc", 120, size - 140);

  if (arcLogo) {
    const foot = 40;
    ctx.save();
    roundRect(ctx, size - 120 - foot, size - 168, foot, foot, 10);
    ctx.clip();
    ctx.drawImage(arcLogo, size - 120 - foot, size - 168, foot, foot);
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("png_encode_failed"));
        else resolve(blob);
      },
      "image/png",
      1
    );
  });
}

export async function copyPaymentShareImage(
  d: PaymentShareDetails
): Promise<void> {
  const blob = await renderPaymentSharePng(d);
  const item = new ClipboardItem({"image/png": blob});
  await navigator.clipboard.write([item]);
}

export async function downloadPaymentShareImage(
  d: PaymentShareDetails
): Promise<void> {
  const blob = await renderPaymentSharePng(d);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hushh-${d.tokenSymbol}-${d.amount}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy image when possible, then open X intent with caption. */
export async function sharePaymentOnTwitter(
  d: PaymentShareDetails
): Promise<"copied" | "downloaded"> {
  const text = paymentShareTweetText(d);
  let mode: "copied" | "downloaded" = "downloaded";
  try {
    await copyPaymentShareImage(d);
    mode = "copied";
  } catch {
    await downloadPaymentShareImage(d);
  }
  window.open(twitterIntentUrl(text), "_blank", "noopener,noreferrer");
  return mode;
}

