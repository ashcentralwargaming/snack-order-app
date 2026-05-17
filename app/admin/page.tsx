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

  const markDone = async (id: number) => {
    await supabase.from("orders").update({ status: "done" }).eq("id", id);
    loadOrders();
  };

  const addItem = async () => {
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

  const updateItem = async (id: number, field: string, value: any) => {
    await supabase.from("menu_items").update({ [field]: value }).eq("id", id);
    loadMenu();
  };

  const deleteItem = async (id: number) => {
    await supabase.from("menu_items").delete().eq("id", id);
    loadMenu();
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial", color: "#000" }}>

      {/* 🔴 HARD TEST MARKER */}
      <h1 style={{ color: "red", fontSize: 24 }}>
        ADMIN-FILE-VERSION-001
      </h1>

      <h1>Admin Dashboard</h1>

      {/* ORDERS */}
      <h2>Orders</h2>

      {orders.length === 0 && <p>No active orders 🎉</p>}

      {orders.map((o) => (
        <div key={o.id} style={{ border: "1px solid #ccc", padding: 10 }}>
          <p>{o.name} - Table {o.table_number}</p>
          <p>Status: {o.status}</p>

          {o.status !== "done" && (
            <button onClick={() => markDone(o.id)}>
              Mark as Done
            </button>
          )}
        </div>
      ))}

      {/* MENU */}
      <h2 style={{ marginTop: 30 }}>Menu Editor</h2>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          placeholder="Price"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />
        <button onClick={addItem}>Add Item</button>
      </div>

      {menu.map((m) => (
        <div key={m.id} style={{ border: "1px solid #ddd", padding: 10 }}>
          <input
            value={m.name}
            onChange={(e) =>
              updateItem(m.id, "name", e.target.value)
            }
          />

          <input
            value={m.price}
            onChange={(e) =>
              updateItem(m.id, "price", Number(e.target.value))
            }
          />

          <label>
            In Stock
            <input
              type="checkbox"
              checked={m.in_stock}
              onChange={(e) =>
                updateItem(m.id, "in_stock", e.target.checked)
              }
            />
          </label>

          <button onClick={() => deleteItem(m.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}