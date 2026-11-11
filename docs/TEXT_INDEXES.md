# Workspace text indexes

v0.6.1 removes the 30-record AI text search sample. Build or resume text index processes every nonempty post, message and account record present in the imported preview. Existing importer file/record limits still apply. A workspace currently contains one imported archive.

Long records are divided into overlapping 450-character sections. The model processes 16 sections per batch. Progress reports completed sections. Stop indexing finishes the current native call and schedules no further batches. Build again resumes completed batches while the workspace stays open. Locking, switching or closing discards unfinished work.

Completed indexes use compact 8-bit vectors and are bound to a hash of their source sections plus the installed model digest. Queries embed only the query and rank cached vectors. Results retain the best section per record and show up to ten records. Updating the model or importing changed data requires rebuilding.

## Saving and isolation

Ordinary workspace indexes stay in session memory. Saving the archive with a PIN or passphrase includes the index inside the same authenticated ciphertext. When an encrypted workspace builds an index, the app encrypts and commits its updated archive atomically. Locking removes the decrypted index from the interface. PIN changes re-encrypt the index with the rest of the archive. Existing saved archives without indexes remain readable.

The app writes no separate plaintext index or vector database. Model assets are shared, while index content stays with its workspace. A storage error or revision conflict preserves the prior snapshot. Completed vectors remain available for retry during that unlocked session. Pending model calls may finish inside the trusted local Ollama process after a workspace is locked.

## Current limits

Image search continues to examine up to eight supported images from a selected ZIP. Image indexing, multipart library reconciliation, cancellation of an in-flight model call, partial-index recovery across app restarts and storage/performance benchmarks for very large imports remain open.

All-imported-text coverage is separate from complete Facebook-export compatibility. The importer can skip unsupported files and cap records. Search can only index the text the importer supplied.

## Verification

Synthetic tests cover content/model invalidation, long Unicode records, records beyond the old sample, compressed ranking, best-section deduplication, cancellation and encryption of an archive containing an index.

Native Windows acceptance uses 36 synthetic posts, including a relevant passage near the end of the final post. It stops after a completed batch, resumes, retrieves the late passage, saves the indexed archive with a PIN, and searches the restored index after unlock and process restart.
