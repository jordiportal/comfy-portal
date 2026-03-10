import { useIsInBottomSheet } from '@/context/bottom-sheet-context';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import React, { forwardRef } from 'react';
import {
  FlatList,
  FlatListProps,
  ScrollView,
  ScrollViewProps,
  TextInput,
  TextInputProps,
} from 'react-native';

export const AdaptiveTextInput = forwardRef<TextInput, TextInputProps>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    const Component = isInSheet ? BottomSheetTextInput : TextInput;
    return <Component ref={ref as any} {...props} />;
  },
);
AdaptiveTextInput.displayName = 'AdaptiveTextInput';

export const AdaptiveScrollView = forwardRef<ScrollView, ScrollViewProps>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    if (isInSheet) {
      return <BottomSheetScrollView ref={ref as any} {...(props as any)} />;
    }
    return <ScrollView ref={ref} {...props} />;
  },
);
AdaptiveScrollView.displayName = 'AdaptiveScrollView';

export const AdaptiveKeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    if (isInSheet) {
      return <BottomSheetScrollView ref={ref as any} {...(props as any)} />;
    }
    return <ScrollView ref={ref} {...props} />;
  },
);
AdaptiveKeyboardAwareScrollView.displayName = 'AdaptiveKeyboardAwareScrollView';

export const AdaptiveFlatList = forwardRef<FlatList, FlatListProps<any>>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    if (isInSheet) {
      return <BottomSheetFlatList ref={ref as any} {...(props as any)} />;
    }
    return <FlatList ref={ref as any} {...props} />;
  },
);
AdaptiveFlatList.displayName = 'AdaptiveFlatList';
