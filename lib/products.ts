export type ProductId =
  | "detail"
  | "comprehensive"
  | "love"
  | "money-job"
  | "compatibility";

export type Product = {
  id: ProductId;
  name: string;
  price: number;
  description: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "detail",
    name: "상세 사주 분석",
    price: 9900,
    description: "사주 원국·오행을 바탕으로 성향과 전체 흐름을 자세히 분석",
  },
  {
    id: "comprehensive",
    name: "종합 사주 분석",
    price: 19900,
    description: "성향·재물·직업·연애·대인관계·시기별 흐름을 종합 분석",
  },
  {
    id: "love",
    name: "연애운 분석",
    price: 7900,
    description: "연애 성향·관계 패턴·인연 흐름을 중심으로 분석",
  },
  {
    id: "money-job",
    name: "재물·직업운 분석",
    price: 7900,
    description: "재물 흐름·직업 성향·커리어 방향을 중심으로 분석",
  },
  {
    id: "compatibility",
    name: "궁합 분석",
    price: 12900,
    description: "두 사람의 사주 원국과 오행을 비교해 관계 흐름을 분석",
  },
];

export const getProduct = (id: ProductId) =>
  PRODUCTS.find((product) => product.id === id);
