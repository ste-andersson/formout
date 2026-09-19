import { SignedIn, SignedOut, SignInButton, useAuth, useClerk } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { isTouchDevice } from "../lib/device";
import { formStatusLabel, getForm, listMyForms } from "../lib/adminApi";
import type { AdminFormSummary } from "../lib/adminApi";
import { cacheMyForms, listCachedMyForms } from "../lib/myFormsCache";
import { listVisitedForms, recordFormVisit } from "../lib/visitedForms";
import { ShareFormLink } from "../components/ShareFormLink";
import { useOfflineMode } from "../components/offlineModeContext";
import { OfflineAuthExceptionModal } from "../components/OfflineAuthExceptionModal";
import "./AdminHome.css";

export function AdminHome() {
  const isMobile = isTouchDevice();
  const { offlineMode, authExceptionsAllowed, setAuthExceptionsAllowed } = useOfflineMode();
  const { openSignIn } = useClerk();
  const signInExceptionDialogRef = useRef<HTMLDialogElement>(null);
  // Signing in needs Clerk's own network calls -- while offline, that's only
  // possible once the auth exception has been granted (see SettingsMenu.tsx
  // for the other place this same exception can be granted).
  const signInNeedsException = offlineMode && !authExceptionsAllowed;

  return (
    <div className="admin-home">
      <h1>Skapa ett formulär</h1>
      {offlineMode ? (
        <p>Den här funktionen kräver internet och fungerar inte i offline-läge.</p>
      ) : (
        <p>
          {isMobile
            ? "Fotografera ett befintligt formulär eller bygg det från grunden."
            : "Ladda upp en fil med ett befintligt formulär eller bygg det från grunden."}
        </p>
      )}
      <SignedOut>
        <p>Du behöver ett konto för att skapa formulär.</p>
        {signInNeedsException ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => signInExceptionDialogRef.current?.showModal()}
          >
            Logga in eller skapa konto
          </button>
        ) : (
          <SignInButton mode="modal">
            <button type="button" className="btn btn--primary">
              Logga in eller skapa konto
            </button>
          </SignInButton>
        )}
      </SignedOut>
      <SignedIn>
        <MyForms />
      </SignedIn>
      <OfflineAuthExceptionModal
        dialogRef={signInExceptionDialogRef}
        variant="sign-in"
        onAllow={() => {
          setAuthExceptionsAllowed(true);
          openSignIn();
        }}
        onCancel={() => {}}
      />
    </div>
  );
}

function PhotoUploadButton() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = isTouchDevice();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    navigate("/admin/forms/new", { state: { uploadedFiles: files } });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => inputRef.current?.click()}
      >
        {isMobile ? "Formulär från foto" : "Formulär från fil"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture={isMobile ? "environment" : undefined}
        multiple={!isMobile}
        onChange={handleFileChange}
        hidden
      />
    </>
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; forms: AdminFormSummary[] };

// Backfills full-schema offline caching (see FormEditor.tsx) for any owned
// form that hasn't been opened in the editor yet -- without this, a form
// owner who never opens most of their own forms could turn on offline mode
// and find their own forms' shared responses unviewable, which just reads as
// "offline mode is broken" rather than "you haven't visited this one yet".
// Skips forms already cached, so this is a no-op once everything's warm.
async function cacheMissingFormSchemas(token: string, forms: AdminFormSummary[]): Promise<void> {
  const visited = await listVisitedForms();
  const cachedIds = new Set(visited.map((v) => v.formId));
  const missing = forms.filter((form) => !cachedIds.has(form.id));
  await Promise.all(missing.map((form) => getForm(token, form.id).then(recordFormVisit)));
}

function MyForms() {
  const { getToken } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const { offlineMode } = useOfflineMode();

  useEffect(() => {
    let cancelled = false;

    function loadFromCache() {
      listCachedMyForms()
        .then((forms) => {
          if (cancelled) return;
          setState({ status: "loaded", forms });
        })
        .catch(() => {
          if (cancelled) return;
          setState({ status: "error" });
        });
    }

    if (offlineMode) {
      loadFromCache();
      return () => {
        cancelled = true;
      };
    }

    getToken()
      .then(async (token) => {
        if (!token) {
          throw new Error("Not signed in");
        }
        return { token, forms: await listMyForms(token) };
      })
      .then(({ token, forms }) => {
        if (cancelled) return;
        setState({ status: "loaded", forms });
        // Best-effort -- keeps the offline fallback fresh, never blocks
        // rendering the list that just loaded successfully.
        cacheMyForms(forms).catch((error: unknown) => {
          console.error("Kunde inte cacha formulärlistan lokalt", error);
        });
        cacheMissingFormSchemas(token, forms).catch((error: unknown) => {
          console.error("Kunde inte cacha formulärinnehåll lokalt", error);
        });
      })
      .catch(() => {
        // The live request failed (e.g. connectivity dropped even though
        // offline mode wasn't switched on) -- fall back to whatever was
        // cached last, instead of a hard error.
        if (cancelled) return;
        loadFromCache();
      });

    return () => {
      cancelled = true;
    };
  }, [getToken, offlineMode]);

  return (
    <div className="my-forms">
      {!offlineMode && (
        <div className="my-forms__actions">
          <PhotoUploadButton />
          <Link to="/admin/forms/new" className="btn btn--secondary">
            Bygg formulär
          </Link>
        </div>
      )}

      <div className="my-forms__list-section">
        <h2 className="my-forms__list-heading">Mina skapade formulär</h2>
        {state.status === "loading" && <p>Laddar…</p>}
        {state.status === "error" && <p>Kunde inte hämta dina formulär.</p>}
        {state.status === "loaded" && (
          <>
            {state.forms.length === 0 ? (
              <p>Du har inga formulär än.</p>
            ) : (
              <ul className="my-forms__list">
                {state.forms.map((form) => (
                  <li key={form.id} className="my-forms__item">
                    <div className="my-forms__info">
                      <Link
                        to={`/admin/forms/${form.id}/edit`}
                        className="my-forms__title"
                      >
                        {form.title}
                      </Link>
                      <span className="my-forms__slug">{form.slug}</span>
                    </div>
                    <div className="my-forms__item-actions">
                      <span
                        className={`status-badge status-badge--${form.status.toLowerCase()}`}
                      >
                        {formStatusLabel(form.status)}
                      </span>
                      <ShareFormLink
                        slug={form.slug}
                        title={form.title}
                        disabled={form.status !== "PUBLISHED"}
                        triggerClassName="btn btn--neutral btn--small"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
