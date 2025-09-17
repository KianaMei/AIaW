// Vite's built-in JSON plugin caused a dev crash on some Node/WSL setups
// when importing JSON as a module. Work around by importing the JSON file
// as raw text and parsing it here, then re-exporting in the same shape.
// This keeps src/version.json available for build-time copy and other tools.

// eslint-disable-next-line import/no-unresolved
import raw from './version.json?raw'

const data = JSON.parse(raw)

export default data
export const version = data.version
export type AppVersion = typeof data
