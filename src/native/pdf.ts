import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { env } from '@/lib/env';
import { getAccessToken, refreshSingleFlight, forceLogout } from '@/lib/api/tokens';
import { ApiError } from '@/lib/api/errors';
import { aceDir } from './files';

/**
 * Downloads a PDF straight to disk with the bearer this app already holds —
 * `api`'s axios interceptor (single-flight refresh + retry on 401) doesn't
 * run here, since `react-native-blob-util`'s `fetch` isn't axios, so the same
 * one-retry dance is reimplemented directly: refresh once on a 401, retry the
 * download once if that refresh actually rotated the token pair, otherwise
 * end the session the same way the interceptor would.
 */
export async function downloadAuthedPdf({ path, fileName }: { path: string; fileName: string }): Promise<string> {
  const target = `${await aceDir()}/${fileName}`;
  const attempt = () =>
    ReactNativeBlobUtil.config({ path: target, overwrite: true }).fetch(
      'GET',
      `${env.API_URL}/api/v1${path}`,
      { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    );

  let res = await attempt();
  if (res.info().status === 401) {
    const result = await refreshSingleFlight();
    if (result === 'refreshed') {
      res = await attempt();
    } else {
      // 'rejected'/'no_token' — the refresh token itself is gone; there's no
      // recovering the session without a real re-login. 'unavailable'
      // (offline/5xx) is treated the same way here: unlike the interceptor,
      // a failed PDF download has no follow-up request to just let fail —
      // failing this whole call with the same error is the simplest, single
      // exit path, and forceLogout is a no-op the second time it's called.
      if (result === 'rejected' || result === 'no_token') forceLogout('session_expired');
      throw new ApiError('http', 401, 'session_expired', 'Your session has expired — sign in again');
    }
  }

  const status = res.info().status;
  if (status >= 400) {
    // A failed download (4xx/5xx) can still leave a partial/error-body file
    // sitting at `target` — `fetch`'s `path` option writes the response body
    // to disk regardless of status. Left behind, a later successful retry
    // would need `overwrite: true` to survive it, but in the meantime a
    // caller that only checks "does a file exist at this path" (not this
    // function, but any future one) would find a corrupt PDF. Clean it up
    // before surfacing the error; failing to unlink (e.g. nothing was
    // actually written) must not mask the real download error.
    await ReactNativeBlobUtil.fs.unlink(target).catch(() => undefined);
    throw new ApiError(
      'http',
      status,
      status === 403 ? 'forbidden' : 'pdf_failed',
      status === 403 ? 'You do not have access to this document' : 'Could not download the PDF',
    );
  }
  return `file://${res.path()}`;
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
