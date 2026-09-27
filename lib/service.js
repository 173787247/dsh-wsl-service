// Pure side of service: normalisation and formatting, testable without Windows.
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function normalize(raw) {
  return ((raw) => ({
      total: num(raw.total),
      services: (raw.services || []).map((s) => ({
        name: String(s.name ?? ""), displayName: String(s.displayName ?? ""),
        status: String(s.status ?? ""), startType: String(s.startType ?? ""),
      })),
    }))(raw ?? {});
}

// Dispatch on the shape of the result rather than making the caller say which
// formatter to use: a result carries either `detail`, or `subkeys`, or neither.
export function format(v) {
  const withOk = { ok: true, ...v };
  if (withOk.detail && typeof formatDetail === "function") return formatDetail(withOk);
  if (withOk.subkeys && typeof formatKeys === "function") return formatKeys(withOk);
  return ((v) => {
      const l = [`win_services ok=${v.ok} listed=${(v.services || []).length} total=${v.total}`];
      for (const s of v.services || []) l.push(`  ${s.status === "Running" ? "RUN " : "    "} ${s.name} [${s.startType}] ${s.displayName}`);
      if (v.error) l.push(`error: ${v.error}`);
      return l.join("\n");
    })(withOk);
}

export function parameters() {
  return {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "name": {
      "type": "string",
      "description": "Inspect one service by name (optional)."
    },
    "state": {
      "type": "string",
      "description": "Filter: running, stopped, or all (default all)."
    },
    "limit": {
      "type": "number",
      "description": "Max services to list (default 40, max 400)."
    },
    "detail": {
      "type": "boolean",
      "description": "Return one service in full: logon account, process id, binary path and dependencies. Requires name."
    }
  }
};
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}

export function normalizeDetail(raw) {
  return ((raw) => {
      const d = raw?.detail ?? {};
      return {
        detail: {
          name: String(d.name ?? ""), displayName: String(d.displayName ?? ""),
          status: String(d.status ?? ""), startType: String(d.startType ?? ""),
          logOnAs: String(d.logOnAs ?? ""), processId: num(d.processId),
          binaryPath: String(d.binaryPath ?? ""),
          dependsOn: (d.dependsOn ?? []).map(String),
          dependedOnBy: (d.dependedOnBy ?? []).map(String),
        },
      };
    })(raw ?? {});
}

export function formatDetail(raw) {
  return ((v) => {
      const d = v.detail ?? {};
      const l = [`win_services ok=${v.ok} detail=${d.name}`, `  ${d.displayName}  [${d.status} / ${d.startType}]`];
      if (d.logOnAs) l.push(`  runs as: ${d.logOnAs}`);
      if (d.processId) l.push(`  process id: ${d.processId}`);
      if (d.binaryPath) l.push(`  binary: ${d.binaryPath}`);
      if ((d.dependsOn ?? []).length) l.push(`  depends on: ${d.dependsOn.join(", ")}`);
      if ((d.dependedOnBy ?? []).length) l.push(`  depended on by: ${d.dependedOnBy.join(", ")}`);
      if (v.error) l.push(`error: ${v.error}`);
      return l.join("\n");
    })(raw ?? {});
}
