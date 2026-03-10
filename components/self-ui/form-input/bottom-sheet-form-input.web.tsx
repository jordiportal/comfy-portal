import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface BottomSheetFormInputProps extends TextInputProps {
  title?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  titleStyle?: TextStyle;
  errorStyle?: TextStyle;
}

function TitleLabel({ text, color, style }: { text: string; color: string; style?: TextStyle }) {
  return <Text style={[styles.title, { color }, style]}>{text}</Text>;
}

function ErrorLabel({ text, color, style }: { text: string; color: string; style?: TextStyle }) {
  return <Text style={[styles.error, { color }, style]}>{text}</Text>;
}

function PasswordToggle({ visible, onToggle, color }: { visible: boolean; onToggle: () => void; color: string }) {
  return (
    <TouchableOpacity style={styles.eyeIcon} onPress={onToggle} activeOpacity={0.7}>
      {visible ? <EyeOff size={18} color={color} /> : <Eye size={18} color={color} />}
    </TouchableOpacity>
  );
}

/**
 * Web version: uses standard TextInput instead of BottomSheetTextInput
 * (BottomSheetTextInput relies on _scrollRef which is null on web)
 */
export const BottomSheetFormInput: React.FC<BottomSheetFormInputProps> = ({
  title,
  error,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  titleStyle,
  errorStyle,
  placeholder,
  secureTextEntry,
  defaultValue,
  value,
  ...restProps
}) => {
  const theme = useResolvedTheme();
  const isDarkMode = theme === 'dark';
  const [showPassword, setShowPassword] = useState(false);

  const inputBackgroundColor = isDarkMode ? Colors.dark.background[50] : Colors.light.background[0];
  const inputTextColor = isDarkMode ? Colors.dark.typography[800] : Colors.light.typography[950];
  const placeholderTextColor = isDarkMode ? Colors.dark.typography[400] : Colors.light.typography[400];
  const titleTextColor = isDarkMode ? Colors.dark.typography[600] : Colors.light.typography[600];
  const errorTextColor = isDarkMode ? Colors.dark.error[500] : Colors.light.error[500];
  const iconColor = isDarkMode ? Colors.dark.typography[600] : Colors.light.typography[600];

  const isPasswordInput = secureTextEntry === true;

  const safeValue = value != null ? String(value) : undefined;
  const safeDefaultValue = defaultValue != null ? String(defaultValue) : undefined;

  return (
    <div style={Object.assign({}, flatStyles.container, containerStyle)}>
      {title ? <TitleLabel text={title} color={titleTextColor} style={titleStyle} /> : null}
      <div style={Object.assign({}, flatStyles.inputContainer, { backgroundColor: inputBackgroundColor }, inputContainerStyle)}>
        <TextInput
          style={[styles.input, { color: inputTextColor }, isPasswordInput && { paddingRight: 40 }, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={isPasswordInput && !showPassword}
          value={safeValue}
          defaultValue={safeDefaultValue}
          {...restProps}
        />
        {isPasswordInput ? <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} color={iconColor} /> : null}
      </div>
      {error ? <ErrorLabel text={error} color={errorTextColor} style={errorStyle} /> : null}
    </div>
  );
};

const flatStyles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 10,
  },
  inputContainer: {
    borderWidth: 0,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative' as const,
  },
};

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    height: 36,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
