export type MenuItem = {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
};

export let menuItems: MenuItem[] = [
  { id: 1, name: "KitKat", price: 1.0, inStock: true },
  { id: 2, name: "Mars Bar", price: 1.0, inStock: true },
  { id: 3, name: "Monster Energy", price: 1.6, inStock: true },
];