import {
  Apple, Beef, Beer, BookOpen, CakeSlice, Candy, Car, Carrot, Coffee, Cookie, Croissant, CupSoda, Drumstick, Egg,
  Fish, Flower2, Footprints, GlassWater, Ham, IceCreamCone, Martini, Milk, Package, PawPrint, Pill, Pizza,
  Popcorn, Salad, Sandwich, Scissors, Shirt, ShoppingBag, ShoppingBasket, Smartphone, Spool, SprayCan, Store,
  Utensils, Wheat, Wine, Wrench, Bone, type LucideIcon, type LucideProps,
} from "lucide-react";
import type { NomeIcone } from "@/lib/icones";

const ICONES: Record<NomeIcone, LucideIcon> = {
  pao: Croissant, bolo: CakeSlice, doce: Candy, salgado: Drumstick, pizza: Pizza, lanche: Sandwich, carne: Beef,
  embutido: Ham, ovo: Egg, laticinio: Milk, cafe: Coffee, bebida: CupSoda, cerveja: Beer, vinho: Wine,
  destilado: Martini, agua: GlassWater, grao: Wheat, fruta: Apple, verdura: Salad, legume: Carrot, peixe: Fish,
  biscoito: Cookie, pipoca: Popcorn, sorvete: IceCreamCone, roupa: Shirt, calcado: Footprints, acessorio: ShoppingBag,
  costura: Spool, pet: PawPrint, racao: Bone, limpeza: SprayCan, remedio: Pill, flor: Flower2, livro: BookOpen,
  eletronico: Smartphone, auto: Car, ferramenta: Wrench, tesoura: Scissors, utensilios: Utensils,
  mercado: ShoppingBasket, loja: Store, pacote: Package,
};

/** Ícone vetorial (lucide) de um item ou negócio. */
export function Icone({ nome, ...props }: LucideProps & { nome: NomeIcone }) {
  const Componente = ICONES[nome];
  return <Componente aria-hidden strokeWidth={1.75} {...props} />;
}
