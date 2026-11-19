import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicUrl } from "./publicFetch";

test("rejects loopback URLs", async () => {
  await assert.rejects(() => assertPublicUrl("http://127.0.0.1/"), { code: "UNSAFE_URL" });
});

test("rejects non-http protocols", async () => {
  await assert.rejects(() => assertPublicUrl("file:///etc/passwd"), { code: "UNSAFE_URL" });
});

test("accepts a public HTTPS hostname", async () => {
  await assert.doesNotReject(() => assertPublicUrl("https://example.com/"));
});

test("keeps test assertions strict", () => {
  assert.equal(typeof assertPublicUrl, "function");
});
