export interface WalletBalanceHeaderProps {
  balance: number;
  loading: boolean;
  canRecharge: boolean;
  onRecharge: () => void;
}
