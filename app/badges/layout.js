// /badges is a client component, so it cannot export `metadata` itself. This
// segment layout supplies the canonical the route previously had none of.
// Title/description/openGraph are deliberately not set here, so the route keeps
// inheriting the root layout's -- declaring a partial openGraph block would
// replace the root's wholesale and drop og:image, which is exactly the bug
// being fixed on /blog, /pricing and /quiz in the same change.
export const metadata = {
  alternates: { canonical: '/badges' },
};

export default function BadgesLayout({ children }) {
  return children;
}
