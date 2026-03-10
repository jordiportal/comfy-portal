import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { KeyboardModal } from '@/components/self-ui/keyboard-modal';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Colors } from '@/constants/Colors';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useResolvedTheme } from '@/store/theme';
import { showToast } from '@/utils/toast';
import { ImagePlus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EditWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
}

export function EditWorkflowModal({ isOpen, onClose, workflowId }: EditWorkflowModalProps) {
  const workflow = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const removeWorkflow = useWorkflowStore((state) => state.removeWorkflow);
  const [name, setName] = useState(workflow?.name || '');
  const [thumbnail, setThumbnail] = useState(workflow?.thumbnail || '');
  const [error, setError] = useState('');
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);
  const theme = useResolvedTheme();
  const activeTheme = (theme ?? 'light') as keyof typeof Colors;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isOpen && workflow) {
      setName(workflow.name);
      setThumbnail(workflow.thumbnail || '');
      setError('');
    }
  }, [isOpen, workflow?.name, workflow?.thumbnail]);

  useEffect(() => {
    if (name.trim().length > 50) {
      setName(name.slice(0, 50));
      showToast.error('Name must be less than 50 characters', undefined, insets.top + 8);
    }
  }, [insets.top, name]);

  if (!workflow) return null;

  const handleUpdate = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    updateWorkflow(workflow.id, {
      name: name.trim(),
      thumbnail,
      data: workflow.data,
    });
    handleClose();
  };

  const handleSelectImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setThumbnail(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  const handleClose = () => {
    setName(workflow.name);
    setThumbnail(workflow.thumbnail || '');
    setError('');
    onClose();
  };

  const handleDelete = () => {
    removeWorkflow(workflow.id);
    setIsDeleteAlertOpen(false);
    onClose();
  };

  return (
    <>
      <KeyboardModal isOpen={isOpen} onClose={handleClose}>
        <KeyboardModal.Header>
          <HStack className="w-full items-center justify-between">
            <Text className="text-lg font-semibold text-primary-500">Edit Workflow</Text>
            <Pressable onPress={handleClose} className="p-1 active:opacity-60">
              <X size={20} color={Colors[activeTheme].primary[500]} />
            </Pressable>
          </HStack>
        </KeyboardModal.Header>
        <KeyboardModal.Body scrollEnabled={false}>
          <VStack space="md">
            <KeyboardModal.Item title="Name" error={error}>
              <Input variant="outline" size="md" className="mt-1 overflow-hidden rounded-md border-0 bg-background-0">
                <InputField
                  onChangeText={(value) => { setName(value); setError(''); }}
                  defaultValue={name}
                  placeholder="Enter workflow name"
                  className="px-3 py-2 text-sm text-primary-500"
                />
              </Input>
            </KeyboardModal.Item>
            <VStack space="xs">
              <Text className="text-sm font-medium text-primary-400">Thumbnail (Optional)</Text>
              <Pressable onPress={handleSelectImage} className="overflow-hidden rounded-md border-0 bg-background-0">
                {thumbnail ? (
                  <Image source={{ uri: thumbnail }} className="h-40 w-full" resizeMode="cover" alt="Workflow thumbnail" />
                ) : (
                  <VStack className="h-40 items-center justify-center">
                    <ImagePlus className="text-primary-300" />
                    <Text className="mt-2 text-sm text-primary-300">Add thumbnail</Text>
                  </VStack>
                )}
              </Pressable>
            </VStack>
          </VStack>
        </KeyboardModal.Body>
        <KeyboardModal.Footer>
          <HStack space="sm">
            <Button
              variant="outline"
              onPress={() => setIsDeleteAlertOpen(true)}
              className="flex-1 rounded-md bg-transparent active:bg-error-50"
              style={{ borderColor: Colors[activeTheme].error[500] }}
            >
              <ButtonText style={{ color: Colors[activeTheme].error[500] }}>Delete</ButtonText>
            </Button>
            <Button variant="solid" onPress={handleUpdate} className="flex-1 rounded-md bg-primary-500">
              <ButtonText className="text-background-0">Save Changes</ButtonText>
            </Button>
          </HStack>
        </KeyboardModal.Footer>
      </KeyboardModal>
      <ConfirmDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDelete}
        title="Delete Workflow"
        description="Are you sure you want to delete this workflow? This action cannot be undone."
        confirmText="Delete"
        confirmButtonColor="bg-error-500"
      />
    </>
  );
}
