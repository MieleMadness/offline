import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalSearchResults } from "./LocalSearch";

const matches = [
  { id: "fictional-private-source.json", reason: "Fictional login details", categoryId: "security" },
  { id: "posts.json", reason: "Fictional birthday post" },
  { id: "interests.json", reason: "Fictional ad interest", categoryId: "advertising" },
  { id: "photos/one.jpg", reason: "Local image similarity" },
];

function renderResults(showPrivate: boolean, results = matches) {
  return renderToStaticMarkup(<LocalSearchResults matches={results}
    showPrivate={showPrivate} onTogglePrivate={() => {}}/>);
}

describe("AI search result privacy", () => {
  it("omits private content and source names from concealed result markup", () => {
    const markup = renderResults(false);
    expect(markup).toContain("Show private values");
    expect(markup).toContain("Private data record");
    expect(markup).not.toContain("fictional-private-source.json");
    expect(markup).not.toContain("Fictional login details");
    expect(markup).toContain("Fictional birthday post");
    expect(markup).toContain("Fictional ad interest");
    expect(markup).toContain("photos/one.jpg");
  });

  it("shows private values when requested and offers a way to hide them", () => {
    const markup = renderResults(true);
    expect(markup).toContain("Hide private values");
    expect(markup).toContain("fictional-private-source.json");
    expect(markup).toContain("Fictional login details");
  });

  it("omits the privacy control when there are no private matches", () => {
    expect(renderResults(false, matches.slice(1))).not.toContain("Show private values");
  });
});
