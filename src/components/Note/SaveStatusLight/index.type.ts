export type SaveStatus = 'saving' | 'saved' | 'error';

export interface SaveStatusLightProps {
  status: SaveStatus;
}
