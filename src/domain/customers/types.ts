export interface CustomerInput {
  name: string;
  type: "PERSON" | "COMPANY";
  document: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
}
export interface CustomerDTO extends CustomerInput {
  id: string;
  version: number;
}
