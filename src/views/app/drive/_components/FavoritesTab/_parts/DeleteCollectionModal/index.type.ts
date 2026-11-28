export interface DeleteCollectionModalProps {
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionName: string | null;
  onSuccess: () => void;
}
