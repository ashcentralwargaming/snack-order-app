"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  const [step, setStep] = useState<"details" | "menu">("details");

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [name, setName] = useState("");
  const [table, setTable] = useState("");

  const [showPopup, setShowPopup] = useState(false);

  // button feedback state
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const press = (key: string) => {
    setActiveBtn(key);

    setTimeout(() => setActiveBtn(null), 120);

    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  useEffect(() => {
    const loadMenu = async () => {
      const { data } = await supabase.from("menu_items").select("*");
      setMenu(data || []);
    };

    loadMenu();

    const channel = supabase
      .channel("menu-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          loadMenu();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const available = menu.filter((m) => m.in_stock);

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

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleSubmit = async () => {
    if (!name || !table || cart.length === 0) return;

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

    if (error || !order) return;

    await supabase.from("order_items").insert(
      cart.map((c) => ({
        order_id: order.id,
        item_name: c.name,
        quantity: c.quantity,
        price: c.price,
      }))
    );

    setShowPopup(true);
  };

  const resetAll = () => {
    setCart([]);
    setName("");
    setTable("");
    setStep("details");
    setShowPopup(false);
  };

  const btnStyle = (key: string) => ({
    opacity: activeBtn === key ? 0.6 : 1,
    transform: activeBtn === key ? "scale(0.98)" : "scale(1)",
    transition: "all 0.08s ease",
  });

  if (step === "details") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logoWrap}>
            <Image
              src="/logo.png"
              alt="Logo"
              width={180}
              height={180}
              style={styles.logo}
            />
          </div>

          <h1 style={styles.title}>Snack Order</h1>

          <input
            style={styles.input}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Table number"
            value={table}
            onChange={(e) => setTable(e.target.value)}
          />

          {/* ✅ FIXED CONTINUE BUTTON (MOBILE SAFE) */}
          <button
            style={{ ...styles.primary, ...btnStyle("continue") }}
            onPointerDown={() => press("continue")}
            onPointerUp={() => setActiveBtn(null)}
            onPointerCancel={() => setActiveBtn(null)}
            onClick={() => {
              if (!name || !table) return;
              setStep("menu");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              style={styles.smallLogo}
            />

            <div style={styles.headerText}>
              {name} — Table {table}
            </div>
          </div>

          <button
            style={{ ...styles.back, ...btnStyle("edit") }}
            onClick={() => {
              press("edit");
              setStep("details");
            }}
          >
            Edit
          </button>
        </div>

        <div style={styles.menu}>
          {available.map((item) => (
            <div key={item.id} style={styles.row}>
              <span style={styles.text}>
                {item.name} £{Number(item.price).toFixed(2)}
              </span>

              <button
                style={{ ...styles.add, ...btnStyle(`add-${item.id}`) }}
                onClick={() => {
                  press(`add-${item.id}`);
                  addItem(item);
                }}
              >
                Add
              </button>
            </div>
          ))}
        </div>

        <div style={styles.bottomBar}>
          <div style={styles.cartText}>
            {cart.length === 0
              ? "No items selected"
              : cart.map((c) => `${c.name} x${c.quantity}`).join(", ")}
          </div>

          <div style={styles.bottomRow}>
            <div style={styles.total}>£{total.toFixed(2)}</div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...styles.clearBtn, ...btnStyle("clear") }}
                onClick={() => {
                  press("clear");
                  clearCart();
                }}
              >
                Clear
              </button>

              <button
                style={{ ...styles.orderBtn, ...btnStyle("order") }}
                onClick={() => {
                  press("order");
                  handleSubmit();
                }}
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPopup && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h1 style={styles.title}>Order received ✅</h1>

            <p style={styles.text}>
              Thanks {name}, your order has been sent.
            </p>

            <p style={styles.text}>Table {table}</p>

            <h3 style={styles.subtitle}>
              Total: £{total.toFixed(2)}
            </h3>

            <button
              style={{ ...styles.primary, ...btnStyle("ok") }}
              onClick={() => {
                press("ok");
                resetAll();
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* styles unchanged */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    backgroundColor: "#f2f2f2",
    padding: 12,
    fontFamily: "Arial",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    position: "relative",
  },
  logoWrap: { display: "flex", justifyContent: "center", marginBottom: 10 },
  logo: { borderRadius: 12 },
  smallLogo: { borderRadius: 6 },
  title: { fontSize: 26, color: "#000", textAlign: "center" },
  input: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    fontSize: 16,
    border: "1px solid #ccc",
    color: "#000",
  },
  primary: {
    width: "100%",
    marginTop: 14,
    padding: 14,
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    fontSize: 16,
    borderRadius: 8,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    userSelect: "none",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerText: { fontSize: 14, color: "#000" },
  back: {
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
  },
  menu: { paddingBottom: 120 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
  },
  text: { color: "#000", fontSize: 16 },
  add: {
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 6,
  },
  bottomBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 520,
    margin: "0 auto",
    backgroundColor: "white",
    borderTop: "1px solid #ddd",
    padding: 12,
  },
  cartText: { fontSize: 12, color: "#000", marginBottom: 6 },
  bottomRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: { fontSize: 18, color: "#000" },
  orderBtn: {
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: 6,
  },
  clearBtn: {
    backgroundColor: "#444",
    color: "#fff",
    border: "none",
    padding: "10px 12px",
    borderRadius: 6,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    maxWidth: 380,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    textAlign: "center",
  },
  subtitle: { marginTop: 10, color: "#000" },
};