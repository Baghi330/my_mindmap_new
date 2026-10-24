import patchrightPkg from "/home/ava7/.vscode/extensions/danielsanmedium.dscodegpt-3.24.79/standalone/node_modules/patchright/index.js";
const { chromium } = patchrightPkg;

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
  ],
});

const ctx = await browser.newContext({ locale: "fa-IR" });
const page = await ctx.newPage();

const errors = [];
const failures = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    errors.push(`[${m.type()}] ${m.text().slice(0, 30)}`);
  }
});
page.on("pageerror", (e) =>
  errors.push(`[uncaught] ${String(e).slice(0, 30)}`),
);
page.on("requestfailed", (r) =>
  failures.push(
    `${r.failure()?.errorText ?? "failed"} ${r.url().slice(0, 140)}`,
  ),
);
page.on("response", (r) => {
  if (r.status() >= 40)
    failures.push(`HTTP ${r.status()} ${r.url().slice(0, 140)}`);
});

const url = "http://127.0.0.1:5175/";
const resp = await page.goto(url, {
  waitUntil: "networkidle",
  timeout: 15000,
});
console.log("HTTP:", resp?.status() ?? "no response");

await page
  .waitForFunction(() => (document.body?.innerText || "").trim().length > 0, {
    timeout: 10000,
  })
  .catch(() => {});

const info = await page
  .evaluate(() => ({
    title: document.title || "",
    bodyChars: (document.body?.innerText || "").trim().length,
    html: document.body?.innerHTML || "",
    dir: document.documentElement.dir || "",
    lang: document.documentElement.lang || "",
  }))
  .catch(() => ({ title: "", bodyChars: 0, html: "" }));

console.log("Title:", info.title);
console.log("Lang:", info.lang);
console.log("Dir:", info.dir);
console.log("Body chars:", info.bodyChars);

// Check for Persian text
const hasPersian =
  info.html.includes("فارسی") ||
  info.html.includes("میانبر") ||
  /[\u060-\u06FF]/.test(info.html);
console.log("Has Persian text:", hasPersian);

// Check for canvas/svg
const hasCanvas = info.html.includes("<canvas") || info.html.includes("<svg");
console.log("Has canvas/svg:", hasCanvas);

// Try to find key elements
const snapshot = await page.evaluate(() => {
  const interactives = Array.from(document.querySelectorAll("button, a, input"))
    .map((el) => ({
      tag: el.tagName,
      text: (el.textContent || "").trim().slice(0, 40),
      disabled: el.disabled,
    }))
    .filter((el) => el.text.length > 0)
    .slice(0, 15);
  return interactives;
});
console.log("Interactives:", JSON.stringify(snapshot, null, 2));

const shot = await page.screenshot({ fullPage: true }).catch(() => null);
if (shot) {
  const fs = await import("node:fs");
  fs.writeFileSync("/home/ava7/projects/mindmap/screenshot.png", shot);
  console.log("Screenshot saved: screenshot.png");
}

console.log("\nConsole errors:", errors.length);
errors.forEach((e) => console.log(" ", e));

console.log("\nFailed requests:", failures.length);
failures.forEach((f) => console.log(" ", f));

await browser.close();
