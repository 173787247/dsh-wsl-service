// Pure side of dsh-wsl-service: normalisation and formatting, testable without Windows.
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

export function format(v) {
  return ((v) => {
      const l = [`win_services ok=${v.ok} listed=${(v.services || []).length} total=${v.total}`];
      for (const s of v.services || []) l.push(`  ${s.status === "Running" ? "RUN " : "    "} ${s.name} [${s.startType}] ${s.displayName}`);
      if (v.error) l.push(`error: ${v.error}`);
      return l.join("\n");
    })({ ok: true, ...v });
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
    }
  }
};
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}
