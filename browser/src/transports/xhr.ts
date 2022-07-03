import { createTransport } from '../../../core/src/index.ts';
import { Transport, TransportMakeRequestResponse, TransportRequest } from '../../../types/src/index.ts';
import { SyncPromise } from '../../../utils/src/index.ts';

import { BrowserTransportOptions } from './types.ts';

/**
 * The DONE ready state for XmlHttpRequest
 *
 * Defining it here as a constant b/c XMLHttpRequest.DONE is not always defined
 * (e.g. during testing, it is `undefined`)
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState}
 */
const XHR_READYSTATE_DONE = 4;

