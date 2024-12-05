import type { Plugin } from '@/types'
import { convertWithHttpSnippetLite } from '@/utils/convertWithHttpSnippetLite'
// @ts-expect-error no types available
import { asynchttp } from '@/httpsnippet-lite/dist/esm/targets/java/asynchttp/client.mjs'

/**
 * java/asynchttp
 */
export const javaAsynchttp: Plugin = {
  target: 'java',
  client: 'asynchttp',
  generate(request) {
    // TODO: Write an own converter
    return convertWithHttpSnippetLite(asynchttp, request)
  },
}
