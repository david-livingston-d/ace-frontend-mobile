import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { api } from '@/lib/api/client';
import { ApiError, toApiError } from '@/lib/api/errors';
import { aceDir } from './files';

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Standard base64 of a byte array. React Native has no `Buffer` and no `btoa`,
 * and `react-native-blob-util`'s `fs.writeFile` only accepts a string, so the
 * bytes have to be encoded here. Output is accumulated in ~8 KB chunks rather
 * than one growing string so a large document doesn't degrade into quadratic
 * concatenation.
 */
/* eslint-disable no-bitwise -- base64 is defined in terms of 6-bit groups; the
   shifts and masks below are the encoding, not a clever trick. */
export function bytesToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  let chunk = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    chunk += B64_ALPHABET[(n >> 18) & 63]! + B64_ALPHABET[(n >> 12) & 63]! + B64_ALPHABET[(n >> 6) & 63]! + B64_ALPHABET[n & 63]!;
    if (chunk.length >= 8192) {
      parts.push(chunk);
      chunk = '';
    }
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    chunk += `${B64_ALPHABET[(n >> 18) & 63]!}${B64_ALPHABET[(n >> 12) & 63]!}==`;
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    chunk += `${B64_ALPHABET[(n >> 18) & 63]!}${B64_ALPHABET[(n >> 12) & 63]!}${B64_ALPHABET[(n >> 6) & 63]!}=`;
  }
  parts.push(chunk);
  return parts.join('');
}
/* eslint-enable no-bitwise */

/**
 * Downloads a PDF to `${DocumentDir}/ace/<fileName>` and returns its `file://` URL.
 *
 * The bytes come through the shared axios `api` instance (`responseType:
 * 'arraybuffer'`, which React Native's XHR implements by asking native for a
 * base64 body and decoding it), so the bearer header, the single-flight
 * refresh-and-retry on 401 and the analytics events all come for free from
 * `client.ts`'s interceptors — this function only has to map the failure to an
 * `ApiError` and put the bytes on disk.
 *
 * It deliberately does *not* use `react-native-blob-util`'s own
 * `config({ path }).fetch(...)` stream-to-disk download. In 0.24.10 that path
 * truncates every response to the first read: `ReactNativeBlobUtilFileResp`'s
 * `ProgressReportingSource.read()` writes the bytes it read to the destination
 * `FileOutputStream` and returns the count, but never writes them into the Okio
 * `sink` buffer it was handed — so the `RealBufferedSource` draining it in
 * `ReactNativeBlobUtilReq.onResponse` finds an empty buffer and reports EOF
 * after one <=8 KB chunk. Anything larger than one socket read lands on disk
 * truncated (and usually rejects with the library's "Download interrupted.").
 */
export async function downloadAuthedPdf({ path, fileName }: { path: string; fileName: string }): Promise<string> {
  const target = `${await aceDir()}/${fileName}`;

  let bytes: Uint8Array;
  try {
    // A longer timeout than `api`'s default 15s: a multi-page invoice on a
    // weak mobile connection is a much slower request than any JSON call.
    const res = await api.get<ArrayBuffer>(path, { responseType: 'arraybuffer', timeout: 60_000 });
    bytes = new Uint8Array(res.data);
  } catch (err) {
    const e = toApiError(err);
    if (e.kind !== 'http') throw e; // network/timeout — the real message is more useful
    if (e.status === 401) throw new ApiError('http', 401, 'session_expired', 'Your session has expired — sign in again');
    if (e.status === 403) throw new ApiError('http', 403, 'forbidden', 'You do not have access to this document');
    throw new ApiError('http', e.status, 'pdf_failed', 'Could not download the PDF');
  }

  if (bytes.length === 0) throw new ApiError('http', 200, 'pdf_failed', 'Could not download the PDF');

  try {
    await ReactNativeBlobUtil.fs.writeFile(target, bytesToBase64(bytes), 'base64');
  } catch {
    // A half-written file at `target` is worse than none: a caller that only
    // checks "does a file exist here" would hand a corrupt PDF to a viewer.
    await ReactNativeBlobUtil.fs.unlink(target).catch(() => undefined);
    throw new ApiError('unknown', null, 'pdf_failed', 'Could not save the PDF');
  }
  return `file://${target}`;
}

/** Explicit "share this PDF" action — always goes through `Share.open`'s
 * chooser (used by the order-detail header's dedicated Share button), unlike
 * `openPdf`'s try-the-device's-default-viewer-first behaviour below. */
export async function sharePdf(fileUrl: string, title: string) {
  await Share.open({ url: fileUrl, type: 'application/pdf', title, failOnCancel: false });
}

export async function openPdf(fileUrl: string, title: string) {
  if (Platform.OS === 'android') {
    try {
      // `actionViewIntent` wants a plain filesystem path, not a `file://` URL
      // — it builds its own `content://` URI via blob-util's own FileProvider
      // (`${applicationId}.provider`, autolinked with a `<files-path path="."/>`
      // entry that already covers `aceDir()`'s `DocumentDir/ace` location).
      // Its promise resolves as soon as `startActivity` succeeds (i.e. once
      // the OS has a viewer to open, before that viewer's own UI even shows),
      // not on the viewer's own dismissal — so this never hangs waiting for
      // the user to close the PDF.
      await ReactNativeBlobUtil.android.actionViewIntent(fileUrl.replace(/^file:\/\//, ''), 'application/pdf');
      return;
    } catch {
      // No app registered for the mime type (`ENOAPP` — common on a bare
      // emulator with no PDF viewer installed) — fall back to the share
      // sheet so the user can still hand the file to something.
    }
  }
  await sharePdf(fileUrl, title);
}
