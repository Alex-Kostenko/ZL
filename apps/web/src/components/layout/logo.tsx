import Link from 'next/link';

export function Logo() {
  return (
    <Link
      href="/"
      className="shrink-0 font-serif text-lg leading-none font-bold text-heading md:text-xl"
    >
      Мисливська лавка
    </Link>
  );
}
