import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useScale } from '@/providers/ScaleProvider';
import { useCopy } from '@/lib/i18n/copy';
import { ChecklistItem } from '@/types';

type Props = {
  items: ChecklistItem[];
  onToggle: (index: number) => void;
  maxVisible?: number;
  onExtraPress?: () => void;
};

export function ChecklistRows({
  items,
  onToggle,
  maxVisible = 3,
  onExtraPress,
}: Props) {
  const { colors } = useTheme();
  const { scale } = useScale();
  const copy = useCopy();
  const visible = items.slice(0, maxVisible);
  const extra = items.length - visible.length;

  return (
    <View style={{ gap: scale.gap / 2, marginTop: 6 }}>
      {visible.map((item, index) => (
        <Pressable
          key={`${item.label}-${index}`}
          onPress={() => onToggle(index)}
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: Math.min(scale.minHitTarget, 44),
          }}
        >
          <Ionicons
            name={item.done ? 'checkbox' : 'square-outline'}
            size={20}
            color={item.done ? colors.success : colors.textMuted}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: scale.meta,
              color: item.done ? colors.textSubtle : colors.text,
              textDecorationLine: item.done ? 'line-through' : 'none',
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
      {extra > 0 ? (
        <Pressable onPress={onExtraPress} disabled={!onExtraPress}>
          <Text style={{ fontSize: scale.meta, color: colors.textSubtle }}>
            {copy.checklistMore(extra)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
