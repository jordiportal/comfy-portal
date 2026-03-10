import { memo } from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

const BottomSheetKeyboardAwareScrollView = memo((props: ScrollViewProps) => {
  return <ScrollView {...props} />;
});

BottomSheetKeyboardAwareScrollView.displayName = 'BottomSheetKeyboardAwareScrollView';

export default BottomSheetKeyboardAwareScrollView;
