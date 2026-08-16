import { StyleSheet, View, type ViewProps } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

export function ContentColumn({ style, ...rest }: ViewProps) {
  const { columnStyle } = useResponsive();
  return <View style={[styles.fill, columnStyle, style]} {...rest} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    minWidth: 0,
  },
});
