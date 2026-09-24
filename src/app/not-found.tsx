import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-body">
      <div className="product-grid">
        <div className="state-center">
          <div className="state-emoji">🔍</div>
          <div className="state-text">Sahifa topilmadi yoki mahsulot katalogdan olib tashlangan</div>
          <Link href="/" className="state-retry">
            Katalogga o&apos;tish
          </Link>
        </div>
      </div>
    </main>
  );
}
