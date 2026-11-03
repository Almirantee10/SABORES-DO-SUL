export const WA = "5563992202561";
export const WA_LABEL = "63 99220-2561";
export const IG_URL = "https://www.instagram.com/saboresdosulpalmas/";

export const PAGES = [
  { href: "/", label: "Início" },
  { href: "/cardapio", label: "Cardápio" },
  { href: "/festas", label: "Festas e eventos" },
  { href: "/como-pedir", label: "Como pedir" },
];

export const img = (n: string) => `/assets/photos/${n}.png`;

export type Size = { id: "cento" | "meio"; label: string; sub: string; price: number; max?: number };
export type Product = {
  id: string;
  cat: string;
  name: string;
  desc: string;
  img: string;
  badge?: string;
  sizes?: Size[];
  flavors?: string[];
  pick?: number;
  price?: number;
  min?: number;
  step?: number;
};

const cento = (p: number, m: number, mc?: number, mm?: number): Size[] => [
  { id: "cento", label: "Cento", sub: "100 unidades" + (mc ? ` · até ${mc} sabores` : ""), price: p, max: mc },
  { id: "meio", label: "Meio cento", sub: "50 unidades" + (mm ? ` · até ${mm} sabores` : ""), price: m, max: mm },
];

export const CATALOG: Product[] = [
  {
    id: "fritos", cat: "fritos", name: "Salgados fritos",
    desc: "Coxinha, balãozinho, bolinhas, quibe e mais. Bem sequinhos e dourados.",
    img: img("salgados-fritos-bandeja"), sizes: cento(70, 35, 5, 4),
    flavors: ["Coxinha de frango", "Balãozinho de calabresa", "Bolinha de carne", "Bolinha de presunto e queijo", "Quibe", "Enroladinho de salsicha", "Quadradinho de creme de milho", "Mini churros de doce de leite"],
  },
  {
    id: "palitinhos", cat: "fritos", name: "Palitinhos",
    desc: "Palitinho de queijo e palitinho de carne de sol, crocantes por fora.",
    img: img("salgados-fritos-bandeja"), sizes: cento(75, 40, 2, 2),
    flavors: ["Palitinho de queijo", "Palitinho de carne de sol"],
  },
  {
    id: "pastel", cat: "fritos", name: "Mini pastel de feira de carne",
    desc: "O especial da casa: massa fininha e recheio cremoso e generoso.",
    img: img("salgados-fritos-bandeja"), badge: "Especial", sizes: cento(90, 50),
  },
  {
    id: "assados", cat: "assados", name: "Salgados assados",
    desc: "Esfirras, enroladinho, minipizzas e mini hambúrguer assado.",
    img: img("minipizza"), sizes: cento(110, 60, 4, 2),
    flavors: ["Esfirra de frango", "Esfirra de carne", "Enroladinho de salsicha", "Minipizza de calabresa", "Minipizza de frango", "Mini hambúrguer assado"],
  },
  { id: "canudinho", cat: "assados", name: "Canudinho recheado de frango", desc: "Casquinha crocante com recheio cremoso. Pedido mínimo: 50 unidades.", img: img("canudinho"), price: 2, min: 50, step: 10 },
  { id: "casquinhas", cat: "assados", name: "Apenas casquinhas", desc: "Para você rechear do seu jeito. Pedido mínimo: 50 unidades.", img: img("canudinho"), price: 1.2, min: 50, step: 10 },
  { id: "mini-hamburguer", cat: "buffet", name: "Mini hambúrguer gourmet", desc: "Pedido mínimo: 25 unidades.", img: img("mini-hamburguer"), price: 5.5, min: 25, step: 5 },
  { id: "mini-baguete", cat: "buffet", name: "Mini baguete frio", desc: "Pedido mínimo: 30 unidades.", img: img("mini-baguete"), price: 2.9, min: 30, step: 5 },
  { id: "mini-sanduiche", cat: "buffet", name: "Mini sanduíche frio de frango", desc: "Pedido mínimo: 30 unidades.", img: img("mini-sanduiche"), price: 2.75, min: 30, step: 5 },
  {
    id: "bolo-cobertura", cat: "bolos", name: "Bolo caseiro com cobertura",
    desc: "Bolo caseiro, fofinho, com cobertura generosa.", img: img("bolo-chocolate"), price: 60, pick: 1,
    flavors: ["Chocolate com brigadeiro", "Ninho com brigadeiro de ninho", "Cenoura com brigadeiro", "Laranja com cobertura"],
  },
  { id: "bolo-simples", cat: "bolos", name: "Bolo caseiro sem cobertura", desc: "Simples, macio e do jeitinho caseiro.", img: img("bolo-milho-laranja"), price: 50, pick: 1, flavors: ["Bolo de milho", "Bolo de laranja"] },
  { id: "torta", cat: "bolos", name: "Torta fria", desc: "Cremosa e bem servida, perfeita para reunir a família.", img: img("torta-fria"), price: 60 },
  { id: "pq-assado", cat: "bolos", name: "Pão de queijo assado", desc: "Macio por dentro e levemente dourado por fora. Feito com queijo de verdade.", img: img("pao-de-queijo-assado"), price: 23 },
  { id: "pq-congelado", cat: "bolos", name: "Pão de queijo congelado", desc: "Prático e delicioso! É só assar e ter pão de queijo quentinho a qualquer hora.", img: img("pao-de-queijo-congelado"), price: 23 },
];

export const BY_ID: Record<string, Product> = Object.fromEntries(CATALOG.map((p) => [p.id, p]));

export const CATS = [
  { id: "fritos", label: "Fritos", title: "Salgados fritos" },
  { id: "assados", label: "Assados", title: "Salgados assados" },
  { id: "buffet", label: "Buffet", title: "Buffet" },
  { id: "bolos", label: "Bolos e especiais", title: "Bolos e especiais" },
];

export const TAB_INFO: Record<string, { label: string; value: string }[]> = {
  fritos: [{ label: "Cento", value: "até 5 sabores" }, { label: "Meio cento", value: "até 4 sabores" }],
  assados: [{ label: "Cento", value: "até 4 sabores" }, { label: "Pedido mínimo", value: "50 unidades" }],
  buffet: [{ label: "Pedido mínimo", value: "25 a 30 unidades" }],
  bolos: [{ label: "Tudo", value: "feito sob encomenda" }],
};

export const PAY = [
  { id: "pix", label: "Pix" },
  { id: "credito", label: "Cartão de crédito" },
  { id: "debito", label: "Cartão de débito" },
  { id: "dinheiro", label: "Dinheiro" },
];

export const RATIO: Record<string, number> = { aniversario: 10, reuniao: 7, coffee: 5 };

export const MARQUEE = ["Coxinha de frango", "Quibe", "Palitinho de queijo", "Esfirra", "Minipizza", "Mini hambúrguer", "Pão de queijo", "Bolo caseiro", "Torta fria", "Mini pastel"];

export const fmt = (v: number) =>
  "R$ " + Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const waUrl = (text: string) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

export const unitOf = (p: Product) => (p.sizes ? "meio cento" : p.min ? "unidade" : "");
export const priceOf = (p: Product) => (p.sizes ? p.sizes[1].price : (p.price as number));
export const maxFlavors = (p: Product, sizeId: string | null) => {
  if (!p.flavors) return 0;
  if (p.pick) return p.pick;
  const z = p.sizes?.find((x) => x.id === sizeId);
  return z?.max || p.flavors.length;
};
