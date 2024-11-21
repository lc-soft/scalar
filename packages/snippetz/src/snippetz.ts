import type { ClientId, Request, TargetId } from './core'
import { fetch as jsFetch } from './plugins/js/fetch'
import { ofetch as jsOFetch } from './plugins/js/ofetch'
import { fetch as nodeFetch } from './plugins/node/fetch'
import { ofetch as nodeOFetch } from './plugins/node/ofetch'
import { undici } from './plugins/node/undici'
import { curl } from './plugins/shell/curl'

/**
 * Generate code examples for HAR requests
 */
export function snippetz() {
  const plugins = [undici, nodeFetch, jsFetch, jsOFetch, nodeOFetch, curl]

  return {
    get(
      target: TargetId,
      client: ClientId<TargetId>,
      request: Partial<Request>,
    ) {
      const plugin = this.findPlugin(target, client)

      if (plugin) {
        return plugin(request)
      }

      return {
        code: '',
      }
    },
    print(
      target: TargetId,
      client: ClientId<TargetId>,
      request: Partial<Request>,
    ) {
      return this.get(target, client, request)?.code
    },
    targets() {
      return (
        plugins
          // all targets
          .map((plugin) => plugin().target)
          // unique values
          .filter((value, index, self) => self.indexOf(value) === index)
      )
    },
    clients() {
      return plugins.map((plugin) => plugin().client)
    },
    plugins() {
      return plugins.map((plugin) => {
        const details = plugin()

        return {
          target: details.target,
          client: details.client,
        }
      })
    },
    findPlugin(target: TargetId | string, client: ClientId<TargetId> | string) {
      return plugins.find((plugin) => {
        const details = plugin()

        return details.target === target && details.client === client
      })
    },
    hasPlugin(target: TargetId | string, client: ClientId<TargetId> | string) {
      return Boolean(this.findPlugin(target, client))
    },
  }
}
