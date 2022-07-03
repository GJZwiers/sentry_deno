import { SyncPromise } from '@sentry/utils';
import { TextEncoder } from 'util';

import { createTransport } from '../../src/transports/base';

async function sleep(delay: number): Promise<void> {
  return new SyncPromise(resolve => setTimeout(resolve, delay));
}

export function makeFakeTransport(delay: number = 2000) {
  let sendCalled = 0;
  let sentCount = 0;
  const makeTransport = () =>
    createTransport({ recordDroppedEvent: () => undefined, textEncoder: new TextEncoder() }, () => {
      sendCalled += 1;
      return new SyncPromise(async res => {
        await sleep(delay);
        sentCount += 1;
        res({});
      });
    });
  return { makeTransport, getSendCalled: () => sendCalled, getSentCount: () => sentCount, delay };
}
