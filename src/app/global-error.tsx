'use client'

import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  Sentry.captureException(error)
  return (
    <html>
      <body>
        <div className="p-6">
          <h2>Something went wrong!</h2>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}


