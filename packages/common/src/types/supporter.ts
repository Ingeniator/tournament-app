export interface Supporter {
  id: string;
  name: string;
  amount: number;
  message?: string;
  timestamp: number;
}

export interface GroupedSupporter {
  name: string;
  totalAmount: number;
  message?: string;
  count: number;
}
