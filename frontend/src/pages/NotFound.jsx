import { Compass } from 'lucide-react'
import Button from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="container-page pt-14">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={Compass}
        title="We could not find that page"
        message="The link may be broken or the page may have moved."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button to="/">Go home</Button>
            <Button to="/marketplace" variant="outline">
              Browse livestock
            </Button>
          </div>
        }
      />
    </div>
  )
}
