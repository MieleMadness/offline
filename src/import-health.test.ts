import { describe, expect, it } from "vitest";
import { assessImport, requireUsableImport } from "./import-health";
import type { ImportedArchive } from "./social-model";

const base: ImportedArchive = {
  report: {
    archiveName: "synthetic.zip", formatHint: "ZIP archive", totalFiles: 1,
    totalUncompressedBytes: 20, displayedFiles: 1,
    entries: [{ path: "index.html", bytes: 20, kind: "html", section: "other" }],
    sections: [
      {id:"photos",label:"Photos",count:0,bytes:0},
      {id:"videos",label:"Videos",count:0,bytes:0},
      {id:"other",label:"Other files",count:1,bytes:20},
    ],
  },
  social: { posts: [], conversations: [], dataCategories: [],
    filesRead: 1, jsonFilesRead: 0, htmlFilesRead: 1,
    filesSkipped: 0, formatHint: "HTML", warnings: [] },
};

describe("conservative archive import assessment", () => {
  it("rejects navigation-only or empty JSON ZIPs rather than silently overwriting memories", () => {
    expect(assessImport(base).status).toBe("unsupported");
    expect(() => requireUsableImport(base)).toThrow(/previous preview was not changed/);
    const placeholder: ImportedArchive = {
      ...base, social: { ...base.social, dataCategories: [{
        id: "other", label: "Other", fileCount: 1,
        records: [{title:"unknown",detail:"Structured export data available in this file.",timestamp:null,sourcePath:"empty.json"}],
      }] },
    };
    expect(assessImport(placeholder).status).toBe("unsupported");
  });

  it("allows a media-only archive but labels it as a partial inventory", () => {
    const onlyMedia: ImportedArchive = {
      ...base, report: { ...base.report,
        totalFiles: 2, displayedFiles: 1,
        sections: [{id:"photos",label:"Photos",count:1,bytes:1}],
      },
    };
    expect(assessImport(onlyMedia)).toMatchObject({
      status: "media-only", mediaFiles: 1, parsedTextFiles: 1, totalFiles: 2,
    });
    expect(assessImport(onlyMedia).limits.join(" ")).toContain("inventory");
    expect(requireUsableImport(onlyMedia).status).toBe("media-only");
  });

  it("reports decoded posts, messages, account records and warning limits", () => {
    const zip: ImportedArchive = {
      ...base, report: { ...base.report, totalFiles: 25 },
      social: {
        ...base.social,
        posts: [{id:"p",text:"Hello",timestamp:null,author:null,mediaCount:0,sourcePath:"posts/one.json"}],
        conversations: [{id:"c",title:"Alex",participants:["Alex"],lastTimestamp:null,
          messages:[{id:"m",sender:"Alex",timestamp:null,text:"Hi",attachments:0}]}],
        dataCategories:[{id:"searches",label:"Searches",fileCount:1,records:[
          {title:"pizza",detail:"Search for pizza",timestamp:null,sourcePath:"searches/history.json"},
        ]}],
        filesSkipped: 2, warnings: ["Some files are too large"],
      },
    };
    const value = requireUsableImport(zip);
    expect(value).toMatchObject({status:"content",posts:1,messages:1,dataRecords:1,
      skippedTextFiles:2,totalFiles:25});
    expect(value.limits.join(" ")).toContain("Some files are too large");
  });
});
