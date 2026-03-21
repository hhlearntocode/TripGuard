import "react-native";

declare module "react-native" {
  interface ViewStyle {
    WebkitMaskImage?: string;
    maskImage?: string;
  }
}
