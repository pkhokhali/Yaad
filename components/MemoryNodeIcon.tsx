import { Image, ImageStyle, StyleProp } from 'react-native';

const source = require('../assets/images/memory-node.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function MemoryNodeIcon({ size = 32, style }: Props) {
  return (
    <Image
      source={source}
      style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
      accessibilityLabel="Yaad Memory Node"
    />
  );
}
