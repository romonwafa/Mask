export interface BeardStyle {
  id: string;
  name: string;
  description: string;
  color: string;
  opacity: number;
  chin_extension_ratio: number;
  mouth_clearance_ratio: number;
  jaw_width_scale: number;
  upper_trim_ratio: number;
}

export interface ApiStylesResponse {
  styles: BeardStyle[];
}
