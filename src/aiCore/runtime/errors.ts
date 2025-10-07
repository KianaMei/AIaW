export class ImageModelResolutionError extends Error {
  constructor(
    public modelId: string,
    public providerId: string,
    public cause?: Error
  ) {
    super(`Failed to resolve image model: ${modelId}`)
    this.name = 'ImageModelResolutionError'
  }
}

export class ImageGenerationError extends Error {
  constructor(message: string, public providerId: string, public modelId: string, public cause?: Error) {
    super(message)
    this.name = 'ImageGenerationError'
  }
}
