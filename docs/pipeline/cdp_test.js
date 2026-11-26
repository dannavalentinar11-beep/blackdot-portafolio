/* BLACKDOT — ejecutor de pruebas con Chrome sin ventana (Chrome DevTools Protocol, sin dependencias).
   Uso: node docs/pipeline/cdp_test.js <url> <archivo-de-prueba.js> [captura.png] [ancho] [alto]
   El archivo de prueba es una expresión asíncrona que devuelve un objeto JSON con los resultados.
   Imprime { result, consoleErrors, exceptions, failedRequests }. */
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const [url, testFile, shot, w = "1440", h = "900"] = process.argv.slice(2);
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
const port = 9300 + Math.floor(Math.random() * 500);
const keep = !!process.env.BD_PROFILE; /* BD_PROFILE=<carpeta> reutiliza el perfil (prueba de persistencia) */
const profile = keep ? process.env.BD_PROFILE : fs.mkdtempSync(path.join(os.tmpdir(), "bdcdp-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${w},${h}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch (e) { await sleep(200); } }
  const tab = tabs.find((t) => t.type === "page");
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pending = new Map(), errors = [], exceptions = [], failed = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value || a.description).join(" "));
    if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) failed.push(m.params.response.status + " " + m.params.response.url);
    if (m.method === "Network.loadingFailed" && !m.params.canceled) failed.push("FAILED " + m.params.errorText + " " + (m.params.requestId));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Network.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 700 });
  await send("Page.navigate", { url });
  await sleep(3000);
  const code = fs.readFileSync(testFile, "utf8");
  const r = await send("Runtime.evaluate", { expression: `(async () => { ${code} })()`, awaitPromise: true, returnByValue: true, timeout: 120000 });
  if (shot) { const s = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(shot, Buffer.from(s.result.data, "base64")); }
  const out = { result: r.result.result ? r.result.result.value : r.result, evalError: r.result.exceptionDetails ? r.result.exceptionDetails.exception.description : undefined, consoleErrors: errors, exceptions, failedRequests: failed };
  console.log(JSON.stringify(out, null, 1));
  ws.close();
  /* Cierre ordenado (Browser.close) para que Chrome escriba localStorage en disco */
  try {
    const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const bws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r) => bws.addEventListener("open", r));
    bws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
    await new Promise((r) => { chrome.on("exit", r); setTimeout(r, 5000); });
  } catch (e) { console.error("cierre ordenado falló:", e.message); chrome.kill(); }
  setTimeout(() => { try { if (!keep) fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* perfil temporal en uso */ } process.exit(0); }, 500);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
