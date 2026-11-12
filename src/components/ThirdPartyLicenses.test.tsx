import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ThirdPartyLicenses from "./ThirdPartyLicenses";

describe("offline third-party model license accessibility", () => {
  it("embeds complete Apache 2.0 terms and model notices in app assets", () => {
    const markup = renderToStaticMarkup(<ThirdPartyLicenses onClose={() => {}}/>);
    expect(markup).toContain("Apache License, Version 2.0");
    expect(markup).toContain("TERMS AND CONDITIONS FOR USE");
    expect(markup).toContain("Google DeepMind");
    expect(markup).toContain("without an Internet connection");
    expect(markup).toContain("Development versions do not yet bundle model weights");
  });
});
