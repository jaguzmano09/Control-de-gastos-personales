export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 before:absolute before:-left-24 before:-top-24 before:h-72 before:w-72 before:rounded-full before:bg-ledger-green/10 before:blur-3xl after:absolute after:-bottom-32 after:-right-20 after:h-80 after:w-80 after:rounded-full after:bg-amber-200/20 after:blur-3xl">{children}</main>;
}
