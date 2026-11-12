import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OfflineModelPack from "./OfflineModelPack";

describe("offline AI model pack preflight copy", () => {
  it("clearly distinguishes integrity inspection from installed or trusted inference", () => {
    const html = renderToStaticMarkup(<OfflineModelPack />);
    expect(html).toContain("Inspect local .offlineai pack");
    expect(html).toContain("without extracting or running");
    expect(html).toContain("not");
    expect(html).toContain("packs cannot be activated");
    expect(html).toContain("publisher-verified");
  });
});
