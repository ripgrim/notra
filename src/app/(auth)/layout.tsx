import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center lg:grid lg:grid-cols-2 lg:items-stretch lg:justify-stretch">
      <div className="relative hidden lg:flex">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="corner-squircle relative h-full w-full overflow-hidden rounded-xl supports-[corner-shape:squircle]:rounded-2xl">
            <Image
              alt="Auth illustration"
              className="object-cover"
              fill
              src="/auth.jpg"
              unoptimized
            />
            <div className="absolute bottom-4 left-4 z-10">
              <p className="text-sm text-white/80">
                Photo by{" "}
                <Link
                  className="underline hover:text-white"
                  href="https://pixabay.com/users/femava-840809/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  femava
                </Link>{" "}
                on{" "}
                <Link
                  className="underline hover:text-white"
                  href="https://pixabay.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Pixabay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="flex h-full flex-col items-center justify-between p-4">
        <div className="self-start">
          <h1 className="sr-only font-semibold uppercase">Notra</h1>
        </div>
        <div className="w-full max-w-md">{children}</div>
        <div>
          <p className="px-8 text-center text-muted-foreground text-xs">
            By continuing, you agree to our{" "}
            <Link
              className="underline underline-offset-4 hover:text-primary"
              href="/terms"
              target="_blank"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="underline underline-offset-4 hover:text-primary"
              href="/privacy"
              target="_blank"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
