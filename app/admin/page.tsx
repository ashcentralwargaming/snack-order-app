"use client";

import { useEffect, useRef, useState } from "react";
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

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const lastSeenOrderId = useRef<number | null>(null);

  const loadData = async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false });

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("*");

    if (ordersError) console.log("ORDERS ERROR:", ordersError);
    if (itemsError) console.log("ITEMS ERROR:", itemsError);

    setOrders(ordersData || []);
    setItems(itemsData || []);
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("orders-debug-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("REALTIME ORDER EVENT:", payload);

          const newOrder = payload.new as Order | undefined;

          if (newOrder && lastSeenOrderId.current !== newOrder.id) {
            lastSeenOrderId.current = newOrder.id;
          }

          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          console.log("REALTIME ITEM EVENT:", payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsDone = async (id: number) => {
    console.log("🟡 CLICKED MARK AS DONE:", id);

    const { data, error, status } = await supabase
      .from("orders")
      .update({ status: "done" })
      .eq("id", id)
      .select();

    console.log("🟢 SUPABASE RESPONSE STATUS:", status);
    console.log("🟢 SUPABASE DATA:", data);
    console.log("🔴 SUPABASE ERROR:", error);

    if (error) {
      alert("UPDATE FAILED: " + error.message);
      return;
    }

    console.log("✅ UPDATE SUCCESSFUL");

    await loadData();
  };

  const activeOrders = orders.filter((o) => o.status !== "done");

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Admin Dashboard (DEBUG MODE)</h1>

      {activeOrders.length === 0 && (
        <p style={styles.empty}>No active orders 🎉</p>
      )}

      {activeOrders.map((order) => (
        <div key={order.id} style={styles.card}>
          <p><b>Name:</b> {order.name}</p>
          <p><b>Table:</b> {order.table_number}</p>

          <p><b>Items:</b></p>
          <ul>
            {items
              .filter((i) => i.order_id === order.id)
              .map((i) => (
                <li key={i.id}>
                  {i.item_name} x{i.quantity}
                </li>
              ))}
          </ul>

          <p><b>Status:</b> {order.status}</p>

          <button
            onClick={() => markAsDone(order.id)}
            style={styles.button}
          >
            Mark as Done
          </button>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 30,
    backgroundColor: "#ffffff",
    fontFamily: "Arial",
    color: "#000000",
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
  },
  empty: {
    color: "#444",
  },
  card: {
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },
  button: {
    marginTop: 10,
    padding: "10px 14px",
    backgroundColor: "#000",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};