export type ParsedRow = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // sign preserved: negative = expense/outflow, positive = income/inflow
};
