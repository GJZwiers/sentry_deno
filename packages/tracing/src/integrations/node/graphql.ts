import { Hub } from '../../../../hub/src/index.ts';
import { EventProcessor, Integration } from '../../../../types/src/index.ts';
import { fill, isThenable, loadModule, logger } from '../../../../utils/src/index.ts';

/** Tracing integration for graphql package */
export class GraphQL implements Integration {
  /**
   * @inheritDoc
   */
  public static id: string = 'GraphQL';

  /**
   * @inheritDoc
   */
  public name: string = GraphQL.id;

  /**
   * @inheritDoc
   */
  public setupOnce(_: (callback: EventProcessor) => void, getCurrentHub: () => Hub): void {
    const pkg = loadModule<{
      [method: string]: (...args: unknown[]) => unknown;
    }>('graphql/execution/execute.js');

    if (!pkg) {
      logger.error('GraphQL Integration was unable to require graphql/execution package.');
      return;
    }

    fill(pkg, 'execute', function (orig: () => void | Promise<unknown>) {
      return function (this: unknown, ...args: unknown[]) {
        const scope = getCurrentHub().getScope();
        const parentSpan = scope?.getSpan();

        const span = parentSpan?.startChild({
          description: 'execute',
          op: 'db.graphql',
        });

        scope?.setSpan(span);

        const rv = orig.call(this, ...args);

        if (isThenable(rv)) {
          return rv.then((res: unknown) => {
            span?.finish();
            scope?.setSpan(parentSpan);

            return res;
          });
        }

        span?.finish();
        scope?.setSpan(parentSpan);
        return rv;
      };
    });
  }
}
