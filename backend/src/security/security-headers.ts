export function securityHeadersOptions(production=process.env.NODE_ENV==='production'){
  return {
    contentSecurityPolicy:{directives:{defaultSrc:["'none'"],baseUri:["'none'"],frameAncestors:["'none'"],formAction:["'none'"]}},
    crossOriginEmbedderPolicy:false,
    referrerPolicy:{policy:'no-referrer' as const},
    hsts:production?{maxAge:15552000,includeSubDomains:true,preload:false}:false,
  };
}
