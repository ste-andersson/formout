import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'

export function AdminHome() {
  return (
    <div>
      <h1>Admin</h1>
      <SignedOut>
        <p>Du måste logga in för att komma åt admin.</p>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <p>Formulärhantering kommer här.</p>
      </SignedIn>
    </div>
  )
}
