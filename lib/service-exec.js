import { runPowerShell } from "./wsl-host.js";
import { normalize } from "./service.js";


const PRELUDE = "$ErrorActionPreference = 'Stop'\n# The console codepage mangles non-ASCII output; force UTF-8.\n[Console]::OutputEncoding = [Text.Encoding]::UTF8";

/** Every parameter reaches PowerShell as a single-quoted literal. */
function q(s) {
  return "'" + String(s ?? "").replace(/'/g, "''") + "'";
}

function clamp(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// Substitution runs on @@TOKEN@@ placeholders rather than bare words: a plain
// replace("NAME", ...) also matches inside LOGNAME, which silently corrupts the
// script. Each token appears at most once.
export function buildScript(a) {
  const values = {
    NAME: q(a.name),
    STATE: q(a.state),
    LIMIT: String(a.limit),
    COUNT: String(a.count),
    LOGNAME: q(a.log),
    LEVEL: String(a.level),
    TOPN: String(a.top),
    REGPATH: q(a.path),
    VALNAME: q(a.name),
  };
  return PRELUDE + "\n" + TEMPLATE.replace(/@@(\w+)@@/g, (_, k) => values[k] ?? "");
}

const TEMPLATE = `

$svc = Get-Service
if (@@NAME@@) { $svc = $svc | Where-Object { $_.Name -eq @@NAME@@ -or $_.DisplayName -eq @@NAME@@ } }
elseif (@@STATE@@) { $svc = $svc | Where-Object { $_.Status -eq @@STATE@@ } }
$list = $svc | Select-Object -First @@LIMIT@@ | ForEach-Object {
  @{ name = $_.Name; displayName = $_.DisplayName; status = "$($_.Status)"; startType = "$($_.StartType)" }
}
ConvertTo-Json -Compress -Depth 4 @{ services = @($list); total = @($svc).Count }
`;

export async function execute(args, config = {}) {
  const a = {
    name: typeof args?.name === "string" ? args.name : "",
    state: typeof args?.state === "string" ? args.state : "",
    log: typeof args?.log === "string" ? args.log : "System",
    path: typeof args?.path === "string" ? args.path : "",
    level: clamp(args?.level, 1, 5, 2),
    count: clamp(args?.count, 1, 200, 20),
    limit: clamp(args?.limit, 1, 400, 40),
    top: clamp(args?.top, 1, 40, 8),
  };
  
  const timeoutMs = clamp(config.timeoutMs, 1000, 120000, 30000);
  const { stdout } = await runPowerShell(buildScript(a), { timeoutMs });
  const raw = JSON.parse(stdout.trim() || "{}");
  if (raw.error) return { ok: false, error: String(raw.error) };
  return { ok: true, ...normalize(raw) };
}
