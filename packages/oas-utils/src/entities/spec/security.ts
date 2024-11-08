import { z } from 'zod'

import { nanoidSchema } from '../shared'

// ---------------------------------------------------------------------------
// COMMON PROPS FOR ALL SECURITY SCHEMES

/** Some common properties used in all security schemes */
const commonProps = z.object({
  /* A description for security scheme. CommonMark syntax MAY be used for rich text representation. */
  description: z.string().optional(),
})

const extendedSecuritySchema = z.object({
  uid: nanoidSchema,
  /** The name key that links a security requirement to a security object */
  nameKey: z.string().optional().default(''),
})

// ---------------------------------------------------------------------------
// API KEY

export const securitySchemeApiKeyIn = ['query', 'header', 'cookie'] as const

const oasSecuritySchemeApiKey = commonProps.extend({
  type: z.literal('apiKey'),
  /** REQUIRED. The name of the header, query or cookie parameter to be used. */
  name: z.string().optional().default(''),
  /** REQUIRED. The location of the API key. Valid values are "query", "header" or "cookie". */
  in: z.enum(securitySchemeApiKeyIn).optional().default('header'),
})

const apiKeyValueSchema = z.object({
  value: z.string().default(''),
})

export const securityApiKeySchema = oasSecuritySchemeApiKey
  .merge(extendedSecuritySchema)
  .merge(apiKeyValueSchema)
export type SecuritySchemeApiKey = z.infer<typeof securityApiKeySchema>

// ---------------------------------------------------------------------------
// HTTP

const oasSecuritySchemeHttp = commonProps.extend({
  type: z.literal('http'),
  /**
   * REQUIRED. The name of the HTTP Authorization scheme to be used in the Authorization header as defined in
   * [RFC7235]. The values used SHOULD be registered in the IANA Authentication Scheme registry.
   */
  scheme: z
    .string()
    .toLowerCase()
    .pipe(z.enum(['basic', 'bearer']))
    .optional()
    .default('basic'),
  /**
   * A hint to the client to identify how the bearer token is formatted.
   * Bearer tokens are usually generated by an authorization server, so
   * this information is primarily for documentation purposes.
   */
  bearerFormat: z
    .union([z.literal('JWT'), z.string()])
    .optional()
    .default('JWT'),
})

const httpValueSchema = z.object({
  username: z.string().default(''),
  password: z.string().default(''),
  token: z.string().default(''),
})

export const securityHttpSchema = oasSecuritySchemeHttp
  .merge(extendedSecuritySchema)
  .merge(httpValueSchema)
export type SecuritySchemaHttp = z.infer<typeof securityHttpSchema>

// ---------------------------------------------------------------------------
// OPENID CONNECT
const oasSecuritySchemeOpenId = commonProps.extend({
  type: z.literal('openIdConnect'),
  /**
   * REQUIRED. OpenId Connect URL to discover OAuth2 configuration values. This MUST be in the
   * form of a URL. The OpenID Connect standard requires the use of TLS.
   */
  openIdConnectUrl: z.string().optional().default(''),
})

export const securityOpenIdSchema = oasSecuritySchemeOpenId.merge(
  extendedSecuritySchema,
)
export type SecuritySchemaOpenId = z.infer<typeof securityOpenIdSchema>

// ---------------------------------------------------------------------------

/**
 * REQUIRED. The authorization URL to be used for this flow. This MUST be in
 * the form of a URL. The OAuth2 standard requires the use of TLS.
 */
const authorizationUrl = z.string().default('')

/**
 * REQUIRED. The token URL to be used for this flow. This MUST be in the
 * form of a URL. The OAuth2 standard requires the use of TLS.
 */
const tokenUrl = z.string().default('')

/** Common properties used across all oauth2 flows */
const oauthCommon = z.object({
  /**
   * The URL to be used for obtaining refresh tokens. This MUST be in the form of a
   * URL. The OAuth2 standard requires the use of TLS.
   */
  'refreshUrl': z.string().optional().default(''),
  /**
   * REQUIRED. The available scopes for the OAuth2 security scheme. A map
   * between the scope name and a short description for it. The map MAY be empty.
   */
  'scopes': z
    .union([
      z.map(z.string(), z.string().optional()),
      z.record(z.string(), z.string().optional()),
      z.object({}),
    ])
    .optional()
    .default({}),
  'selectedScopes': z.array(z.string()).optional().default([]),
  /** Extension to save the client Id associated with an oauth flow */
  'x-scalar-client-id': z.string().optional().default(''),
  /** The auth token */
  'token': z.string().default(''),
})

/** Setup a default redirect uri if we can */
const defaultRedirectUri =
  typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname
    : ''

/** Options for the x-usePkce extension */
export const pkceOptions = ['SHA-256', 'plain', 'no'] as const

export const oasOauthFlowSchema = z
  .discriminatedUnion('type', [
    /** Configuration for the OAuth Implicit flow */
    oauthCommon.extend({
      'type': z.literal('implicit'),
      authorizationUrl,
      'x-scalar-redirect-uri': z
        .string()
        .optional()
        .default(defaultRedirectUri),
    }),
    /** Configuration for the OAuth Resource Owner Password flow */
    oauthCommon.extend({
      type: z.literal('password'),
      tokenUrl,
      clientSecret: z.string().default(''),
      username: z.string().default(''),
      password: z.string().default(''),
    }),
    /** Configuration for the OAuth Client Credentials flow. Previously called application in OpenAPI 2.0. */
    oauthCommon.extend({
      type: z.literal('clientCredentials'),
      tokenUrl,
      clientSecret: z.string().default(''),
    }),
    /** Configuration for the OAuth Authorization Code flow. Previously called accessCode in OpenAPI 2.0.*/
    oauthCommon.extend({
      'type': z.literal('authorizationCode'),
      authorizationUrl,
      /**
       * Whether to use PKCE for the authorization code flow.
       *
       * TODO: add docs
       */
      'x-usePkce': z.enum(pkceOptions).optional().default('no'),
      'x-scalar-redirect-uri': z
        .string()
        .optional()
        .default(defaultRedirectUri),
      tokenUrl,
      'clientSecret': z.string().default(''),
    }),
  ])
  .optional()
  .default({ type: 'implicit', authorizationUrl: 'http://localhost:8080' })

const oasSecuritySchemeOauth2 = commonProps.extend({
  type: z.literal('oauth2'),
  /** REQUIRED. An object containing configuration information for the flow types supported. */
  flows: z.record(
    z.enum(['implicit', 'password', 'clientCredentials', 'authorizationCode']),
    oasOauthFlowSchema,
  ),
})

export const securityOauthSchema = oasSecuritySchemeOauth2.merge(
  extendedSecuritySchema,
)

export type SecuritySchemeOauth2 = z.infer<typeof securityOauthSchema>

// ---------------------------------------------------------------------------
// Final Types

/**
 * Security Requirement
 * Lists the required security schemes to execute this operation OR the whole collection/spec.
 * The name used for each property MUST correspond to a security scheme declared in the Security
 * Schemes under the Components Object.
 *
 * The key (name) here will be matched to the key of the securityScheme for linking
 *
 * @see https://spec.openapis.org/oas/latest.html#security-requirement-object
 */
export const oasSecurityRequirementSchema = z.record(
  z.string(),
  z.array(z.string()).optional().default([]),
)

/** OAS Compliant security schemes */
export const oasSecuritySchemeSchema = z.union([
  oasSecuritySchemeApiKey,
  oasSecuritySchemeHttp,
  oasSecuritySchemeOauth2,
  oasSecuritySchemeOpenId,
])

/** Extended security schemes for workspace usage */
export const securitySchemeSchema = z.union([
  securityApiKeySchema,
  securityHttpSchema,
  securityOpenIdSchema,
  securityOauthSchema,
])

/**
 * Security Scheme Object
 *
 * @see https://spec.openapis.org/oas/latest.html#security-scheme-object
 */
export type SecurityScheme = z.infer<typeof securitySchemeSchema>
export type SecuritySchemePayload = z.input<typeof securitySchemeSchema>
