export type AdminProductId =
  | "free"
  | "love"
  | "money-job"
  | "detail"
  | "compatibility"
  | "comprehensive";

export type AdminProduct = {
  id: AdminProductId;
  name: string;
  price: number;
  description: string;
};

export const ADMIN_PRODUCTS: AdminProduct[] = [
  {
    id: "free",
    name: "무료 사주 맛보기",
    price: 0,
    description: "사주 원국과 오행을 바탕으로 핵심 성향만 간단하게 확인",
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
    id: "detail",
    name: "상세 사주 분석",
    price: 9900,
    description: "성향·오행·강점·주의점을 균형 있게 상세 분석",
  },
  {
    id: "compatibility",
    name: "궁합 분석",
    price: 12900,
    description: "두 사람의 사주와 오행을 비교해 관계 특징을 분석",
  },
  {
    id: "comprehensive",
    name: "종합 사주 분석",
    price: 19999,
    description: "성향·재물·직업·연애·대인관계·전체 흐름을 종합 분석",
  },
];

export function getAdminProduct(id: string) {
  return ADMIN_PRODUCTS.find((product) => product.id === id);
}
