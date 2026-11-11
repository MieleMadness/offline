import type { ImportedArchive } from "./social-model";

/** Reject navigation-only and empty archives before mutating any stored preview. */
export interface ImportHealth {
  posts: number;
  messages: number;
  dataRecords: number;
  mediaFiles: number;
  parsedTextFiles: number;
  skippedTextFiles: number;
  totalFiles: number;
  status: "content" | "media-only" | "unsupported";
  limits: string[];
}

const EMPTY_PLACEHOLDER = "Structured export data available in this file.";

export function assessImport(archive: ImportedArchive): ImportHealth {
  const social = archive.social;
  const posts = social.posts.filter(post => post.text.trim() || post.mediaCount > 0).length;
  const messages = social.conversations.reduce((sum, chat) =>
    sum + chat.messages.filter(message => message.text.trim() || message.attachments > 0).length, 0);
  // A synthesized placeholder for an unreadable JSON shape is not decoded content.
  const dataRecords = social.dataCategories.reduce((sum, category) => sum +
    category.records.filter(record => record.detail.trim() &&
      record.detail !== EMPTY_PLACEHOLDER).length, 0);
  const mediaFiles = archive.report.sections
    .filter(section => section.id === "photos" || section.id === "videos")
    .reduce((sum, section) => sum + section.count, 0);
  const totalFiles = archive.report.totalFiles;
  const parsedTextFiles = social.jsonFilesRead + social.htmlFilesRead;
  const skippedTextFiles = social.filesSkipped;
  const content = posts + messages + dataRecords;
  const status = content > 0 ? "content" : mediaFiles > 0 ? "media-only" : "unsupported";
  const limits: string[] = [];
  if (status === "media-only") {
    limits.push("No readable posts, messages or account records were decoded. This import contains only the media/file inventory.");
  } else if (status === "unsupported") {
    limits.push("No readable Facebook posts, messages, account records or recognizable media files were found.");
  }
  if (skippedTextFiles > 0) {
    limits.push(String(skippedTextFiles) + " HTML/JSON files could not be included in this preview.");
  }
  if (archive.report.displayedFiles < totalFiles) {
    limits.push("File inventory shows the first " + archive.report.displayedFiles + " of " + totalFiles + " files.");
  }
  if (social.warnings.length) limits.push(...social.warnings);
  return { posts, messages, dataRecords, mediaFiles, parsedTextFiles,
    skippedTextFiles, totalFiles, status, limits };
}

export function requireUsableImport(archive: ImportedArchive): ImportHealth {
  const result = assessImport(archive);
  if (result.status === "unsupported") {
    throw new Error("This ZIP has no recognized social records or media. Your previous preview was not changed. Try a Facebook download that includes posts, messages or photos.");
  }
  return result;
}
