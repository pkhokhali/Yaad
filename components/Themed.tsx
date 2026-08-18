/**
 * Legacy Expo template helpers — wired to Yaad theme colors.
 */
import { Text as DefaultText, View as DefaultView } from 'react-native';

import { darkColors, lightColors } from '@/constants/theme';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: 'text' | 'background',
) {
  const theme = useColorScheme();
  const palette = theme === 'dark' ? darkColors : lightColors;
  const colorFromProps = props[theme === 'dark' ? 'dark' : 'light'];

  if (colorFromProps) {
    return colorFromProps;
  }
  return palette[colorName];
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background',
  );

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
