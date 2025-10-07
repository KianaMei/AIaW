export function normalizeBaseUrl(baseURL?: string, versionSegment?: string): string | undefined {
  if (!baseURL) return baseURL
  let url = baseURL.trim()
  // remove duplicated trailing slashes
  url = url.replace(/\/+$/, '')
  if (versionSegment) {
    // ensure version segment present once
    const seg = versionSegment.replace(/^\/+|\/+$/g, '')
    const re = new RegExp(`/(?:${seg})$`)
    if (!re.test(url)) url = `${url}/${seg}`
  }
  return url
}
