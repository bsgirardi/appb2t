export interface CollectionInput {
  name: string;
  description: string;
  active: boolean;
  position: number;
  productIds: string[];
  removeImage?: boolean;
  expectedVersion?: number;
}
export interface CollectionDTO extends CollectionInput {
  id: string;
  version: number;
  imageUrl: string | null;
}
export interface PublicCollectionDTO {
  slug?: string;
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
}
