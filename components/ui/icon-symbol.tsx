// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Tab bar icons
  'house.fill': 'home',
  'book': 'menu-book',
  'magnifyingglass': 'search',
  'bookmark': 'bookmark',
  'person': 'person',
  
  // Navigation icons
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  
  // Action icons
  'checkmark': 'check',
  'checkmark.circle': 'check-circle-outline',
  'checkmark.circle.fill': 'check-circle',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'square.and.arrow.up': 'share',
  'bookmark.fill': 'bookmark',
  'ellipsis': 'more-horiz',
  
  // Book/Reading icons
  'book.fill': 'menu-book',
  'lightbulb.fill': 'lightbulb',
  'text.alignleft': 'format-align-left',
  'target': 'track-changes',
  'sparkles': 'auto-awesome',
  
  // Religious/Theological icons
  'cross.fill': 'add',
  'cross.circle.fill': 'add-circle',
  'star.fill': 'star',
  'hand.raised.fill': 'pan-tool',
  'hands.sparkles.fill': 'volunteer-activism',
  'eye.fill': 'visibility',
  'wand.and.stars': 'auto-fix-high',
  'exclamationmark.triangle.fill': 'warning',
  
  // Context/Info icons
  'building.columns.fill': 'account-balance',
  'map.fill': 'map',
  'person.fill': 'person',
  'calendar': 'calendar-today',
  'clock': 'access-time',
  'video.fill': 'videocam',
  'gearshape': 'settings',
  'trophy': 'emoji-events',
  
  // Theme/UI icons
  'sun.max': 'wb-sunny',
  'moon': 'nightlight-round',
  'bell': 'notifications',
  'creditcard': 'credit-card',
  'questionmark.circle': 'help-outline',
  'textformat': 'format-size',
  'number': 'tag',
  'highlighter': 'highlight',
  'arrow.down.circle': 'arrow-circle-down',
  'arrow.counterclockwise': 'refresh',
  
  // Other commonly used
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'info.circle': 'info',
  'info.circle.fill': 'info',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
