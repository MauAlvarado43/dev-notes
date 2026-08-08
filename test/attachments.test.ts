import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachmentFolder,
  attachmentMarkdown,
  isImageAttachment,
  sanitizeAttachmentName,
  uniqueAttachmentName
} from '../src/domain/attachments';

test('attachments are grouped by the title of the note that owns them', () => {
  assert.equal(attachmentFolder('Release notes.md'), 'Release notes');
});

test('file names from the operating system are made safe for the notes folder', () => {
  assert.equal(sanitizeAttachmentName('report.pdf'), 'report.pdf');
  assert.equal(sanitizeAttachmentName('quarter/report:2026.pdf'), 'report-2026.pdf');
  assert.equal(sanitizeAttachmentName('  spaced.png  '), 'spaced.png');
  assert.equal(sanitizeAttachmentName('..\\..\\escape.txt'), 'escape.txt');
  assert.equal(sanitizeAttachmentName('...'), 'file');
  assert.equal(sanitizeAttachmentName('.hidden'), 'hidden');
});

test('a name already in use keeps both files', () => {
  assert.equal(uniqueAttachmentName('report.pdf', []), 'report.pdf');
  assert.equal(uniqueAttachmentName('report.pdf', ['report.pdf']), 'report (2).pdf');
  assert.equal(uniqueAttachmentName('report.pdf', ['REPORT.PDF', 'report (2).pdf']), 'report (3).pdf');
  assert.equal(uniqueAttachmentName('notes', ['notes']), 'notes (2)');
});

test('images are recognized by extension, regardless of casing', () => {
  assert.ok(isImageAttachment('diagram.PNG'));
  assert.ok(isImageAttachment('photo.jpeg'));
  assert.ok(!isImageAttachment('report.pdf'));
});

test('inserted Markdown points at the attachment relative to its note', () => {
  assert.equal(
    attachmentMarkdown('Docker.md', 'report.pdf'),
    '[report.pdf](.attachments/Docker/report.pdf)'
  );
  assert.equal(
    attachmentMarkdown('My note.md', 'wide shot.png'),
    '![wide shot.png](.attachments/My%20note/wide%20shot.png)'
  );
  assert.equal(
    attachmentMarkdown('Docker.md', 'a [b].txt'),
    '[a \\[b\\].txt](.attachments/Docker/a%20%5Bb%5D.txt)'
  );
});
