import { ErrorState } from '../ui/States'

export default function RouteError() {
  return (
    <div className="container-page pt-14">
      <ErrorState title="This page hit a problem" message="Something unexpected went wrong. Reload the page or go back to the homepage." />
    </div>
  )
}
