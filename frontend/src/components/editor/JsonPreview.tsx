import type { FormSchema } from '../../lib/formSchema'
import './JsonPreview.css'

interface JsonPreviewProps {
  schema: FormSchema
}

export function JsonPreview({ schema }: JsonPreviewProps) {
  return (
    <pre className="json-preview">
      <code>{JSON.stringify(schema, null, 2)}</code>
    </pre>
  )
}
