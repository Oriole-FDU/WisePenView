export interface CreateMenuItem {
  id: 'folder' | 'drawio' | 'note' | 'importNote' | 'skill' | 'upload';
  label: string;
  disabled?: boolean;
}

export interface CreateMenuProps {
  disabled?: boolean;
  items: CreateMenuItem[];
  onSelect: (id: CreateMenuItem['id']) => void;
}
