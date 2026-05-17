"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Order = {
  id: number;
  name: string;
  table_number: string;
  status: string;
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  in_stock: boolean;
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // LOAD DATA
  useEffect(() => {
    loadOrders();
    loadMenu();
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*");
    setOrders(data || []);
  };

  const loadMenu = async () => {
    const { data } = await supabase.from("menu_items").select("*");
    setMenu(data || []);
  };

  // MARK ORDER DONE
  const markDone = async (id: number) => {
    await supabase
      .from("orders")
      .update({ status: "done" })
      .eq("id", id);

    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // ADD MENU ITEM
  const addMenuItem = async () => {
    if (!newName || !newPrice) return;

    await supabase.from("menu_items").insert([
      {
        name: newName,
        price: Number(newPrice),
        in_stock: true,
      },
    ]);

    setNewName("");
    setNewPrice("");
    loadMenu();
  };

  // UPDATE MENU ITEM
  const updateItem = async (id: number, field: string, value: any) => {
    await supabase
      .from("menu_items")
      .update({ [field]: value })
      .eq("id", id);

    loadMenu();
  };

  // DELETE ITEM
  const deleteItem = async (id: number) => {
    await supabase.from("menu_items").delete().eq("id", id);
    loadMenu();
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Admin Dashboard</h1>

      {/* ORDERS */}
      <h2 style={styles.subtitle}>Orders</h2>

      {orders.map((order) => (
        <div key={order.id} style={styles.card}>
          <p><b>{order.name}</b> - Table {order.table_number}</p>
          <p>Status: {order.status}</p>

          <button onClick={() => markDone(order.id)}>
            Mark as Done
          </button>
        </div>
      ))}

      {/* MENU EDITOR */}
      <h2 style={styles.subtitle}>Menu Editor</h2>

      <div style={styles.card}>
        <input
          placeholder="Item name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <input
          placeholder="Price"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />

        <button onClick={addMenuItem}>Add Item</button>
      </div>

      {menu.map((item) => (
        <div key={item.id} style={styles.card}>
          <input
            value={item.name}
            onChange={(e) =>
              updateItem(item.id, "name", e.target.value)
            }
          />

          <input
            value={item.price}
            onChange={(e) =>
              updateItem(item.id, "price", Number(e.target.value))
            }
          />

          <label>
            In Stock:
            <input
              type="checkbox"
              checked={item.in_stock}
              onChange={(e) =>
                updateItem(item.id, "in_stock", e.target.checked)
              }
            />
          </label>

          <button onClick={() => deleteItem(item.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    fontFamily: "Arial",
    backgroundColor: "#fff",
    color: "#000",
  },
  title: { fontSize: 28 },
  subtitle: { marginTop: 20 },
  card: {
    padding: 12,
    border: "1px solid #ccc",
    marginBottom: 10,
  },
};