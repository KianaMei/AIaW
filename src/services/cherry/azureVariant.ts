type AzureVariant = {
  mode: 'chat' | 'responses'
  useDeploymentBasedUrls?: boolean
}

export function resolveAzureVariant(apiVersion?: string): AzureVariant {
  // Azure preview often uses Responses API
  if (apiVersion === 'preview') {
    return { mode: 'responses' }
  }
  return { mode: 'chat', useDeploymentBasedUrls: true }
}
