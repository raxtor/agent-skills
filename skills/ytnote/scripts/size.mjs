// Reports how much disk the transcript store uses and what is safe to delete.
// The same measurement checks.mjs runs at start-of-invocation; this is the standalone view.
// Usage: node size.mjs
import { mb, measureStore, root } from './store.mjs'

const size = measureStore()

console.log(
  `${mb(size.bytes)} MB in ${root}; captions raw ${mb(size.captionsRaw)} MB; transcribed raw ${mb(size.transcribedRaw)} MB; limit ${mb(size.limit)} MB`,
)
if (size.overLimit) {
  console.log(
    `OVER LIMIT: deleting captions raw would free ${mb(size.captionsRaw)} MB. Transcribed raw stays — it was paid for. Ask the user first.`,
  )
}
