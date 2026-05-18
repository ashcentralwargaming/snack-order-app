"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Order = {
  id: number;
  name: string;
  table_number: string;
  status: string;
};

type OrderItem = {
  id: number;
  order_id: number;
  item_name: string;
  quantity: number;
  price: number;
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  in_stock: boolean;
  is_drink: boolean;
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newIsDrink, setNewIsDrink] = useState(false);

  useEffect(() => {
    loadOrders();
    loadOrderItems();
    loadMenu();

    // ✅ LIVE UPDATES (ONLY ADDITION)

    const ordersChannel = supabase
      .channel("orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();

    const itemsChannel = supabase
      .channel("order-items-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadOrderItems()
      )
      .subscribe();

    const menuChannel = supabase
      .channel("menu-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => loadMenu()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(menuChannel);
    };
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*");
    setOrders((data || []).filter((o) => o.status !== "done"));
  };

  const loadOrderItems = async () => {
    const { data } = await supabase.from("order_items").select("*");
    setOrderItems(data || []);
  };

  const loadMenu = async () => {
    const { data } = await supabase.from("menu_items").select("*");
    setMenu(data || []);
  };

  const markDone = async (id: number) => {
    await supabase.from("orders").update({ status: "done" }).eq("id", id);
    loadOrders();
  };

  const addItem = async () => {
    if (!newName || !newPrice) return;

    const { error } = await supabase.from("menu_items").insert([
      {
        name: newName,
        price: Number(newPrice),
        in_stock: true,
        is_drink: newIsDrink,
      },
    ]);

    if (!error) {
      setNewName("");
      setNewPrice("");
      setNewIsDrink(false);
      loadMenu();
    } else {
      alert(error.message);
    }
  };

  const updateItem = async (id: number, field: string, value: any) => {
    await supabase.from("menu_items").update({ [field]: value }).eq("id", id);
    loadMenu();
  };

  const deleteItem = async (id: number) => {
    await supabase.from("menu_items").delete().eq("id", id);
    loadMenu();
  };

  const getItemsForOrder = (orderId: number) => {
    return orderItems.filter((i) => i.order_id === orderId);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Admin Dashboard</h1>

        <h2 style={styles.section}>Orders</h2>

        {orders.map((o) => (
          <div key={o.id} style={styles.card}>
            <div style={styles.row}>
              <span style={styles.text}>
                {o.name} — Table {o.table_number}
              </span>

              <button style={styles.done} onClick={() => markDone(o.id)}>
                Done
              </button>
            </div>

            <div style={styles.items}>
              {getItemsForOrder(o.id).map((i) => (
                <div key={i.id} style={styles.item}>
                  {i.item_name} x {i.quantity}
                </div>
              ))}
            </div>
          </div>
        ))}

        <h2 style={styles.section}>Menu</h2>

        <div style={styles.addRow}>
          <input
            style={styles.inputName}
            placeholder="Item name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <input
            style={styles.inputPrice}
            placeholder="Price"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />

          <label style={styles.text}>
            <input
              type="checkbox"
              checked={newIsDrink}
              onChange={(e) => setNewIsDrink(e.target.checked)}
            />
            Drink
          </label>

          <button style={styles.button} onClick={addItem}>
            Add
          </button>
        </div>

        {menu.map((m) => (
          <div key={m.id} style={styles.menuRow}>
            <span style={styles.text}>
              {m.name} — £{m.price}
            </span>

            <div style={styles.controls}>
              <label style={styles.text}>
                <input
                  type="checkbox"
                  checked={m.in_stock}
                  onChange={(e) =>
                    updateItem(m.id, "in_stock", e.target.checked)
                  }
                />
                In stock
              </label>

              <label style={styles.text}>
                <input
                  type="checkbox"
                  checked={m.is_drink}
                  onChange={(e) =>
                    updateItem(m.id, "is_drink", e.target.checked)
                  }
                />
                Drink
              </label>

              <button
                style={styles.delete}
                onClick={() => deleteItem(m.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f2f2f2",
    padding: 12,
    fontFamily: "Arial",
  },

  container: {
    maxWidth: 600,
    margin: "0 auto",
  },

  title: {
    fontSize: 26,
    color: "#000",
  },

  section: {
    marginTop: 18,
    fontSize: 18,
    color: "#000",
  },

  text: {
    color: "#000",
    fontSize: 14,
  },

  card: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  items: {
    marginTop: 6,
  },

  item: {
    fontSize: 13,
    color: "#000",
    paddingLeft: 6,
  },

  addRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 12,
  },

  inputName: {
    flex: 3,
    minWidth: 140,
    padding: 8,
    border: "1px solid #ccc",
    color: "#000",
  },

  inputPrice: {
    flex: 1,
    minWidth: 70,
    padding: 8,
    border: "1px solid #ccc",
    color: "#000",
  },

  menuRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },

  controls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  button: {
    padding: "8px 10px",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    borderRadius: 6,
  },

  done: {
    padding: "6px 10px",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    borderRadius: 6,
  },

  delete: {
    padding: "6px 10px",
    backgroundColor: "red",
    color: "#fff",
    border: "none",
    borderRadius: 6,
  },
};