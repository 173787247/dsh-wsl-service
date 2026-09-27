import { detectWsl } from "./lib/wsl-host.js";
import * as core from "./lib/service.js";
import { execute } from "./lib/service-exec.js";

export const name = "dsh-wsl-service";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  const wsl = detectWsl();

  ctx.systemPrompt.section({
    name: "tool:win_services",
    order: 215,
    text: "Use win_services for WSL/Windows interop: Read Windows service state from WSL: list services and inspect one by name.",
  });

  ctx.tools.register({
    name: "win_services",
    description: "Read Windows service state from WSL: list services and inspect one by name.",
    parameters: core.parameters(),
    output: {
      schema: core.outputSchema(),
      render: (_args, value) => [{ type: "text", text: core.format(value) }],
    },
    timeoutMs: Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : 30_000,
    isConcurrencySafe: () => true,
    async execute(args) {
      if (!wsl) return { ok: false, error: "not running in WSL" };
      try {
        return await execute(args, config);
      } catch (error) {
        return { ok: false, error: String(error?.message ?? error) };
      }
    },
    presentCall: () => ({ card: "generic", title: "win_services" }),
    presentResult: (_args, result) => ({ card: "generic", title: "win_services", content: result?.content }),
  });
}
