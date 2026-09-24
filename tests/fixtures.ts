import type {
  PhoneBucket,
  PhoneGroup,
  PhoneInfo,
  PhoneSerialUnit,
  Product,
  ProductUnit,
  ProductVariant,
} from "../src/lib/storefront/types.ts";

export function unit(overrides: Partial<ProductUnit> = {}): ProductUnit {
  return {
    unit_id: null,
    unit_name: "dona",
    multiplier: 1,
    price: 10000,
    original_price: null,
    currency: "",
    cur_price: 10000,
    cur_original_price: null,
    ...overrides,
  };
}

export function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 1,
    name: "Qizil",
    price: 20000,
    original_price: null,
    currency: "",
    cur_price: 20000,
    cur_original_price: null,
    stock: 5,
    in_stock: true,
    ...overrides,
  };
}

export function serial(overrides: Partial<PhoneSerialUnit> = {}): PhoneSerialUnit {
  return {
    id: 501,
    imei_masked: "35•••••••1234",
    condition: "new",
    condition_label: "Yangi",
    battery_health: null,
    battery_cycles: null,
    note: "",
    price: 6050000,
    cur_price: 500,
    currency: "USD",
    ...overrides,
  };
}

export function group(overrides: Partial<PhoneGroup> = {}): PhoneGroup {
  return {
    key: "128 GB|black|",
    storage: "128 GB",
    color: "black",
    color_label: "Qora",
    color_hex: "#000000",
    region: "",
    count: 1,
    uniform: false,
    units: [serial()],
    ...overrides,
  };
}

export function phoneInfo(overrides: Partial<PhoneInfo> = {}): PhoneInfo {
  return {
    mode: "individual",
    from_price: 6050000,
    from_cur_price: 500,
    currency: "USD",
    groups: [],
    buckets: [],
    ...overrides,
  };
}

export function bucket(overrides: Partial<PhoneBucket> = {}): PhoneBucket {
  return {
    key: "64 GB|||USD|500.0",
    storage: "64 GB",
    color: "",
    color_label: "",
    color_hex: "",
    region: "",
    base_price: 500,
    currency: "USD",
    price: 6050000,
    original_price: null,
    cur_price: 500,
    cur_original_price: null,
    count: 20,
    ...overrides,
  };
}

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Mahsulot",
    sku: "ART-1",
    description: "",
    category_id: 10,
    category_name: "Kiyim",
    category_parent_id: null,
    category_parent_name: null,
    image: "https://cdn.example/p.jpg",
    stock_type: "tracked",
    stock: 5,
    in_stock: true,
    has_variants: false,
    variants: [],
    units: [unit()],
    discount_percent: 0,
    product_type: "",
    attributes: {},
    phone: null,
    ...overrides,
  };
}
