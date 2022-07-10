import { __DEBUG_BUILD__ } from "../../../types/src/globals.ts";
import { getGlobalObject, logger } from '../../../utils/src/index.ts';

import { IdleTransaction } from '../idletransaction.ts';
import { SpanStatusType } from '../span.ts';
import { getActiveTransaction } from '../utils.ts';

const global = getGlobalObject<Window>();

/**
 * Add a listener that cancels and finishes a transaction when the global
 * document is hidden.
 */
export function registerBackgroundTabDetection(): void {
  if (global && global.document) {
    global.document.addEventListener('visibilitychange', () => {
      const activeTransaction = getActiveTransaction() as IdleTransaction;
      if (global.document.hidden && activeTransaction) {
        const statusType: SpanStatusType = 'cancelled';

        __DEBUG_BUILD__ &&
          logger.log(
            `[Tracing] Transaction: ${statusType} -> since tab moved to the background, op: ${activeTransaction.op}`,
          );
        // We should not set status if it is already set, this prevent important statuses like
        // error or data loss from being overwritten on transaction.
        if (!activeTransaction.status) {
          activeTransaction.setStatus(statusType);
        }
        activeTransaction.setTag('visibilitychange', 'document.hidden');
        activeTransaction.finish();
      }
    });
  } else {
    __DEBUG_BUILD__ &&
      logger.warn('[Tracing] Could not set up background tab detection due to lack of global document');
  }
}
