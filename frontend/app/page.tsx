import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Impakt PCTO</h1>
        <p className="text-slate-600">Accedi per continuare</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Vai al login
        </Link>
      </div>
    </main>
  );
}
