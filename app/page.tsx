"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  in_stock: boolean;
};

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function Home() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [table, setTable] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadMenu = async () => {
      const { data } = await supabase.from("menu_items").select("*");
      setMenu(data || []);
    };

    loadMenu();
  }, []);

  const available = menu.filter((m) => m.in_stock);

  // ➕ add item
  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === item.id);

      if (exists) {
        return prev.map((c) =>
          c.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  // ➕ increase
  const increase = (id: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, quantity: c.quantity + 1 } : c
      )
    );
  };

  // ➖ decrease
  const decrease = (id: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === id ? { ...c, quantity: c.quantity - 1 } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  // 🗑️ REMOVE ITEM (NEW)
  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async () => {
    if (!name || !table || cart.length === 0) {
      alert("Please fill all fields and select items");
      return;
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          name,
          table_number: table,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error || !order) {
      alert(error?.message || "Order failed");
      return;
    }

    const items = cart.map((c) => ({
      order_id: order.id,
      item_name: c.name,
      quantity: c.quantity,
      price: c.price,
    }));

    const { error: itemError } = await supabase
      .from("order_items")
      .insert(items);

    if (itemError) {
      alert(itemError.message);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Order placed successfully</h1>
          <p style={styles.text}>We’ll bring it to your table shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Snack Order</h1>

        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Table number"
          value={table}
          onChange={(e) => setTable(e.target.value)}
          style={styles.input}
        />

        <h2 style={styles.subtitle}>Menu</h2>

        {available.map((item) => (
          <div key={item.id} style={styles.item}>
            <span style={styles.text}>
              {item.name} — £{Number(item.price).toFixed(2)}
            </span>

            <button onClick={() => addItem(item)} style={styles.button}>
              Add
            </button>
          </div>
        ))}

        <h2 style={styles.subtitle}>Cart</h2>

        {cart.length === 0 && (
          <p style={styles.text}>No items selected</p>
        )}

        {cart.map((item) => (
          <div key={item.id} style={styles.item}>
            <span style={styles.text}>
              {item.name} (£{item.price}) x {item.quantity}
            </span>

            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => decrease(item.id)}>-</button>
              <button onClick={() => increase(item.id)}>+</button>
              <button onClick={() => removeItem(item.id)}>Remove</button>
            </div>
          </div>
        ))}

        <button onClick={handleSubmit} style={styles.button}>
          Place Order
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    fontFamily: "Arial",
  },
  card: {
    width: 420,
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: 28,
    color: "#000",
  },
  subtitle: {
    marginTop: 20,
    color: "#000",
  },
  text: {
    color: "#000",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    border: "1px solid #ccc",
    backgroundColor: "white",
    color: "#000",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
    color: "#000",
  },
  button: {
    padding: "6px 12px",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
};