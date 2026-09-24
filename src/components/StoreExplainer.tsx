"use client";

import Link from "next/link";

import { useCustomer } from "@/lib/customer/CustomerProvider";

/** "Buyurtma berish oson": the three steps, and a way in for partner shops. */
export function StoreExplainer() {
  const { customer } = useCustomer();

  return (
    <section className="store-explainer" aria-labelledby="how-title">
      <div className="store-explainer-head">
        <h2 id="how-title">Buyurtma berish oson</h2>
        <p>
          Avval aniq model va mavjud konfiguratsiyani tanlaysiz. Buyurtma yuborilgach, do&apos;kon tasdiqlash uchun
          siz bilan bog&apos;lanadi.
        </p>
      </div>
      <div className="step-grid">
        <article className="step-card">
          <div className="step-no">01</div>
          <h3>Qoldiqdan tanlang</h3>
          <p>Modelni ochib, xotira, rang, region va mavjud bo&apos;lsa qurilma holatini tekshiring.</p>
        </article>
        <article className="step-card">
          <div className="step-no">02</div>
          <h3>Buyurtmani yuboring</h3>
          <p>Savatda miqdorni belgilang, kuryer yoki olib ketishni va to&apos;lov usulini tanlang.</p>
        </article>
        <article className="step-card">
          <div className="step-no">03</div>
          <h3>Tasdiqni kuting</h3>
          <p>Buyurtma raqami yaratiladi. Do&apos;kon mavjudlik va topshirish tafsilotlarini tasdiqlaydi.</p>
        </article>
      </div>
      <div className="partner-panel">
        <div>
          <h3>Do&apos;konlar uchun tezkor xarid</h3>
          <p>
            {customer
              ? `Siz ${customer.name || customer.customer_name} uchun shaxsiy narxlarni ko'ryapsiz.`
              : "Mavjud mijoz ID orqali kirib, shaxsiy narxlar va hisob tarixini ko'rishi mumkin."}
          </p>
        </div>
        <Link href="/account" className="partner-action">
          {customer ? "Hisobimni ochish" : "Hamkor sifatida kirish"}
        </Link>
      </div>
    </section>
  );
}
