export interface Player {
  id: string;
  name: string;
  unavailable?: boolean;
  group?: 'A' | 'B';
  clubId?: string;
  rankSlot?: number;
}
