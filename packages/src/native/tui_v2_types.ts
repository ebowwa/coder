/**
 * TUI v2 Type definitions
 * Re-exported from the native module for TypeScript consumption
 */

export interface RenderMessage {
  role: string;
  content: string;
}

export interface RenderState {
  messages: RenderMessage[];
  input_value: string;
  cursor_pos: number;
  status_text: string;
  is_loading: boolean;
  streaming_text: string;
  model: string;
  show_help: boolean;
  help_text: string;
  search_mode: boolean;
  search_query: string;
  search_results: SearchResult[];
  search_selected: number;
}

export interface InputEvent {
  event_type: "key" | "resize" | "none";
  key?: string;
  modifiers?: string;
  new_width?: number;
  new_height?: number;
}

export interface SearchResult {
  file_path: string;
  line_number: number;
  content: string;
}
