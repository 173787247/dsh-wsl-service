import { runPowerShell } from "./wsl-host.js";
import { normalize, normalizeDetail } from "./service.js";

/** The kit's one escaping rule: single-quote the value, doubling any apostrophe. */
function esc(s) {
  return "'" + String(s ?? "").replace(/'/g, "''") + "'";
}

function clamp(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/**
 * The script is built here, at the call site, the way every other plugin in the
 * kit does it: the PowerShell is written inline and the values are escaped as
 * they are interpolated. An earlier version of this file used a @@TOKEN@@
 * substitution table instead, which needed a template literal that ate the
 * backslashes in a regex and quoted every token twice.
 */
export function script(a) {
  return ((a) => (a.detail
      ? `
$one = Get-CimInstance Win32_Service | Where-Object { $_.Name -eq ${esc(a.name)} } | Select-Object -First 1
if ($null -eq $one) { ConvertTo-Json -Compress @{ error = 'service not found' }; exit }
$deps = @(); $need = @()
try { $deps = @((Get-Service -Name ${esc(a.name)}).DependentServices | ForEach-Object { $_.Name }) } catch {}
try { $need = @((Get-Service -Name ${esc(a.name)}).ServicesDependedOn | ForEach-Object { $_.Name }) } catch {}
ConvertTo-Json -Compress -Depth 4 @{ detail = @{
  name = $one.Name; displayName = $one.DisplayName; status = "$($one.State)"; startType = "$($one.StartMode)"
  logOnAs = $one.StartName; processId = $one.ProcessId; binaryPath = $one.PathName
  dependsOn = $need; dependedOnBy = $deps
} }`
      : `
$svc = Get-Service
if (${esc(a.name)}) { $svc = $svc | Where-Object { $_.Name -eq ${esc(a.name)} -or $_.DisplayName -eq ${esc(a.name)} } }
elseif (${esc(a.state)}) { $svc = $svc | Where-Object { $_.Status -eq ${esc(a.state)} } }
$list = $svc | Select-Object -First ${a.limit} | ForEach-Object {
  @{ name = $_.Name; displayName = $_.DisplayName; status = "$($_.Status)"; startType = "$($_.StartType)" }
}
ConvertTo-Json -Compress -Depth 4 @{ services = @($list); total = @($svc).Count }`))(a);
}

export async function execute(args, config = {}) {
  const a = {
    name: typeof args?.name === "string" ? args.name : "",
    state: typeof args?.state === "string" ? args.state : "",
    log: typeof args?.log === "string" ? args.log : "System",
    path: typeof args?.path === "string" ? args.path : "",
    provider: typeof args?.provider === "string" ? args.provider : "",
    level: clamp(args?.level, 1, 5, 2),
    count: clamp(args?.count, 1, 200, 20),
    limit: clamp(args?.limit, 1, 400, 40),
    top: clamp(args?.top, 1, 40, 8),
    detail: Boolean(args?.detail),
    subkeys: Boolean(args?.subkeys),
    all: Boolean(args?.all),
    full: Boolean(args?.full),
    since: null,
  };


  if (a.detail && !a.name) return { ok: false, error: "detail requires name" };
  const timeoutMs = clamp(config.timeoutMs, 1000, 120000, 30000);
  if (a.detail) {
    if (!a.name) return { ok: false, error: "detail requires name" };
    const { stdout } = await runPowerShell(script(a), { timeoutMs });
    const raw = JSON.parse(stdout.trim() || "{}");
    if (raw.error) return { ok: false, error: String(raw.error) };
    return { ok: true, ...normalizeDetail(raw) };
  }
  const { stdout } = await runPowerShell(script(a), { timeoutMs });
  const raw = JSON.parse(stdout.trim() || "{}");
  if (raw.error) return { ok: false, error: String(raw.error) };
  return { ok: true, ...normalize(raw) };
}
