import {
  addGlobalEventProcessor,
  getCurrentHub,
} from "../../../core/src/index.ts";
import { Event, Integration } from "../../../types/src/index.ts";
import { getGlobalObject } from "../../../utils/src/index.ts";

const global = getGlobalObject<Window>();

/** HttpContext integration collects information about HTTP request headers */
export class HttpContext implements Integration {
  /**
   * @inheritDoc
   */
  public static id: string = "HttpContext";

  /**
   * @inheritDoc
   */
  public name: string = HttpContext.id;

  /**
   * @inheritDoc
   */
  public setupOnce(): void {
    addGlobalEventProcessor((event: Event) => {
      if (getCurrentHub().getIntegration(HttpContext)) {
        // if none of the information we want exists, don't bother
        // @ts-ignore no document in deno
        if (!navigator && !location && !global.document) {
          return event;
        }

        // grab as much info as exists and add it to the event
        const url = (event.request && event.request.url) ||
          (location && location.href);
        // @ts-ignore no document in deno
        const { referrer } = global.document || {};
        const { userAgent } = navigator || {};

        const headers = {
          ...(event.request && event.request.headers),
          ...(referrer && { Referer: referrer }),
          ...(userAgent && { "User-Agent": userAgent }),
        };
        const request = { ...(url && { url }), headers };

        return { ...event, request };
      }
      return event;
    });
  }
}
