import { supabase } from "@/integrations/supabase/client";

export async function seedTestData() {
  try {
    // Check if data already exists
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id")
      .limit(1);

    if (existingProducts && existingProducts.length > 0) {
      console.log("Test data already exists");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.tenant_id) return;

    const tenantId = profile.tenant_id;

    // Create categories
    const categories = [
      { name: "মুদি", color: "#10B981", tenant_id: tenantId },
      { name: "ঔষধ", color: "#EF4444", tenant_id: tenantId },
      { name: "ফাস্ট ফুড", color: "#F59E0B", tenant_id: tenantId },
      { name: "পানীয়", color: "#3B82F6", tenant_id: tenantId },
      { name: "স্ট্যাশনারি", color: "#8B5CF6", tenant_id: tenantId },
    ];

    const { data: createdCategories } = await supabase
      .from("categories")
      .insert(categories)
      .select();

    // Create suppliers
    const suppliers = [
      {
        name: "ঢাকা হোলসেল",
        phone: "01711222333",
        email: "dhaka@example.com",
        tenant_id: tenantId,
      },
      {
        name: "চট্টগ্রাম সাপ্লাইয়ার্স",
        phone: "01811222444",
        email: "ctg@example.com",
        tenant_id: tenantId,
      },
      {
        name: "সিলেট ট্রেডিং",
        phone: "01911222555",
        email: "sylhet@example.com",
        tenant_id: tenantId,
      },
    ];

    await supabase.from("suppliers").insert(suppliers);

    // Create products
    const products = [
      {
        name: "চাল ১ কেজি",
        sku: "RICE001",
        category_id: createdCategories?.[0]?.id,
        purchase_price: 50,
        selling_price: 60,
        current_stock: 100,
        low_stock_threshold: 20,
        unit: "kg",
        tenant_id: tenantId,
      },
      {
        name: "ডাল ১ কেজি",
        sku: "LENTIL001",
        category_id: createdCategories?.[0]?.id,
        purchase_price: 80,
        selling_price: 100,
        current_stock: 50,
        low_stock_threshold: 10,
        unit: "kg",
        tenant_id: tenantId,
      },
      {
        name: "তেল ১ লিটার",
        sku: "OIL001",
        category_id: createdCategories?.[0]?.id,
        purchase_price: 150,
        selling_price: 180,
        current_stock: 30,
        low_stock_threshold: 10,
        unit: "ltr",
        tenant_id: tenantId,
      },
      {
        name: "চিনি ১ কেজি",
        sku: "SUGAR001",
        category_id: createdCategories?.[0]?.id,
        purchase_price: 60,
        selling_price: 75,
        current_stock: 80,
        low_stock_threshold: 15,
        unit: "kg",
        tenant_id: tenantId,
      },
      {
        name: "লবণ ১ কেজি",
        sku: "SALT001",
        category_id: createdCategories?.[0]?.id,
        purchase_price: 20,
        selling_price: 30,
        current_stock: 100,
        low_stock_threshold: 20,
        unit: "kg",
        tenant_id: tenantId,
      },
      {
        name: "প্যারাসিটামল",
        sku: "MED001",
        category_id: createdCategories?.[1]?.id,
        purchase_price: 2,
        selling_price: 3,
        current_stock: 200,
        low_stock_threshold: 50,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "অ্যান্টিবায়োটিক",
        sku: "MED002",
        category_id: createdCategories?.[1]?.id,
        purchase_price: 50,
        selling_price: 65,
        current_stock: 50,
        low_stock_threshold: 20,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "বার্গার",
        sku: "FOOD001",
        category_id: createdCategories?.[2]?.id,
        purchase_price: 80,
        selling_price: 120,
        current_stock: 20,
        low_stock_threshold: 5,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "পিৎজা",
        sku: "FOOD002",
        category_id: createdCategories?.[2]?.id,
        purchase_price: 150,
        selling_price: 250,
        current_stock: 15,
        low_stock_threshold: 5,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "চিকেন রোল",
        sku: "FOOD003",
        category_id: createdCategories?.[2]?.id,
        purchase_price: 60,
        selling_price: 100,
        current_stock: 25,
        low_stock_threshold: 10,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "কোকা-কোলা",
        sku: "DRINK001",
        category_id: createdCategories?.[3]?.id,
        purchase_price: 30,
        selling_price: 40,
        current_stock: 100,
        low_stock_threshold: 20,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "পেপসি",
        sku: "DRINK002",
        category_id: createdCategories?.[3]?.id,
        purchase_price: 30,
        selling_price: 40,
        current_stock: 80,
        low_stock_threshold: 20,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "স্প্রাইট",
        sku: "DRINK003",
        category_id: createdCategories?.[3]?.id,
        purchase_price: 30,
        selling_price: 40,
        current_stock: 60,
        low_stock_threshold: 20,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "পানি ১ লিটার",
        sku: "DRINK004",
        category_id: createdCategories?.[3]?.id,
        purchase_price: 15,
        selling_price: 20,
        current_stock: 150,
        low_stock_threshold: 30,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "কলম",
        sku: "STAT001",
        category_id: createdCategories?.[4]?.id,
        purchase_price: 10,
        selling_price: 15,
        current_stock: 200,
        low_stock_threshold: 50,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "নোটবুক",
        sku: "STAT002",
        category_id: createdCategories?.[4]?.id,
        purchase_price: 40,
        selling_price: 60,
        current_stock: 100,
        low_stock_threshold: 20,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "পেন্সিল",
        sku: "STAT003",
        category_id: createdCategories?.[4]?.id,
        purchase_price: 5,
        selling_price: 8,
        current_stock: 150,
        low_stock_threshold: 40,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "রাবার",
        sku: "STAT004",
        category_id: createdCategories?.[4]?.id,
        purchase_price: 3,
        selling_price: 5,
        current_stock: 200,
        low_stock_threshold: 50,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "শার্পনার",
        sku: "STAT005",
        category_id: createdCategories?.[4]?.id,
        purchase_price: 8,
        selling_price: 12,
        current_stock: 100,
        low_stock_threshold: 30,
        unit: "pcs",
        tenant_id: tenantId,
      },
      {
        name: "স্কেল",
        sku: "STAT006",
        category_id: createdCategories?.[4]?.id,
        purchase_price: 15,
        selling_price: 25,
        current_stock: 80,
        low_stock_threshold: 20,
        unit: "pcs",
        tenant_id: tenantId,
      },
    ];

    const { data: createdProducts } = await supabase
      .from("products")
      .insert(products)
      .select();

    // Create customers
    const customers = [
      {
        name: "রহিম মিয়া",
        phone: "01711111111",
        email: "rahim@example.com",
        tenant_id: tenantId,
      },
      {
        name: "করিম উদ্দিন",
        phone: "01811111112",
        tenant_id: tenantId,
      },
      {
        name: "সালমা বেগম",
        phone: "01911111113",
        tenant_id: tenantId,
      },
      {
        name: "জামাল হোসেন",
        phone: "01611111114",
        tenant_id: tenantId,
      },
      {
        name: "নাজমা আক্তার",
        phone: "01511111115",
        tenant_id: tenantId,
      },
      {
        name: "আলী আহমেদ",
        phone: "01411111116",
        tenant_id: tenantId,
      },
      {
        name: "ফাতেমা খাতুন",
        phone: "01311111117",
        tenant_id: tenantId,
      },
      {
        name: "হাসান মাহমুদ",
        phone: "01211111118",
        tenant_id: tenantId,
      },
      {
        name: "সুমাইয়া রহমান",
        phone: "01711111119",
        tenant_id: tenantId,
      },
      {
        name: "রফিক মোল্লা",
        phone: "01811111120",
        tenant_id: tenantId,
      },
    ];

    const { data: createdCustomers } = await supabase
      .from("customers")
      .insert(customers)
      .select();

    // Create expenses
    const expenses = [
      {
        category: "দোকান ভাড়া",
        amount: 15000,
        note: "মাসিক ভাড়া - ডিসেম্বর",
        date: "2024-12-01",
        tenant_id: tenantId,
        created_by: userData.user.id,
      },
      {
        category: "বিদ্যুৎ বিল",
        amount: 3500,
        note: "নভেম্বরের বিল",
        date: "2024-12-05",
        tenant_id: tenantId,
        created_by: userData.user.id,
      },
      {
        category: "কর্মচারী বেতন",
        amount: 12000,
        note: "নভেম্বরের বেতন",
        date: "2024-12-01",
        tenant_id: tenantId,
        created_by: userData.user.id,
      },
      {
        category: "ইন্টারনেট বিল",
        amount: 1000,
        note: "মাসিক ইন্টারনেট",
        date: "2024-12-10",
        tenant_id: tenantId,
        created_by: userData.user.id,
      },
      {
        category: "পরিবহন খরচ",
        amount: 2500,
        note: "পণ্য আনা-নেওয়া",
        date: "2024-12-15",
        tenant_id: tenantId,
        created_by: userData.user.id,
      },
    ];

    await supabase.from("expenses").insert(expenses);

    // Create sales with random dates in the last 30 days
    const paymentMethods = ["cash", "bkash", "nagad", "card"];
    const salesData = [];

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      // Random 2-5 items per sale
      const itemCount = 2 + Math.floor(Math.random() * 4);
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const product =
          createdProducts?.[Math.floor(Math.random() * createdProducts.length)];
        if (product) {
          const qty = 1 + Math.floor(Math.random() * 3);
          items.push({
            id: product.id,
            name: product.name,
            price: product.selling_price,
            qty: qty,
          });
          subtotal += product.selling_price * qty;
        }
      }

      const taxAmount = subtotal * 0.05; // 5% tax
      const discountAmount = Math.random() > 0.7 ? subtotal * 0.1 : 0; // 10% discount sometimes
      const totalAmount = subtotal + taxAmount - discountAmount;

      salesData.push({
        items: JSON.stringify(items),
        payment_method:
          paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        total_amount: totalAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        customer_id:
          Math.random() > 0.3
            ? createdCustomers?.[
                Math.floor(Math.random() * createdCustomers.length)
              ]?.id
            : null,
        cashier_id: userData.user.id,
        tenant_id: tenantId,
        created_at: date.toISOString(),
      });
    }

    await supabase.from("sales").insert(salesData);

    console.log("✅ Test data seeded successfully!");
  } catch (error) {
    console.error("Error seeding test data:", error);
  }
}
