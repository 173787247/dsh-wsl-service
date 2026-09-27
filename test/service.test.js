import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalize, format, parameters } from "../lib/service.js";

describe("service", () => {
  it("normalises a service row", () => {
    const v = normalize({ total: 3, services: [{ name: "Spooler", displayName: "Print Spooler", status: "Running", startType: "Automatic" }] });
    assert.equal(v.total, 3);
    assert.equal(v.services[0].name, "Spooler");
  });
  it("defaults missing fields rather than emitting undefined", () => {
    const v = normalize({ services: [{}] });
    assert.deepEqual(v.services[0], { name: "", displayName: "", status: "", startType: "" });
  });
  it("marks running services in the summary", () => {
    const out = format(normalize({ total: 1, services: [{ name: "Spooler", status: "Running", displayName: "Print" }] }));
    assert.match(out, /RUN/);
  });
});
