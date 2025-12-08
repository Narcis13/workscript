/**
 * ResourceEditPage - Edit resource metadata and content
 *
 * @module pages/resources/ResourceEditPage
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentEditor } from '@/components/resources/ContentEditor';
import {
  useResource,
  useResourceContent,
  useUpdateResource,
  useUpdateContent,
} from '@/hooks/api/useResources';
import { toast } from 'sonner';

interface FormData {
  name: string;
  description: string;
  tags: string;
  isPublic: boolean;
}

export default function ResourceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: resource, isLoading, error } = useResource(id!);
  const isTextBased = ['prompt', 'document', 'data'].includes(resource?.type || '');
  const { data: originalContent, isLoading: contentLoading } = useResourceContent(id!, isTextBased);

  const updateResource = useUpdateResource();
  const updateContent = useUpdateContent();

  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const isResettingRef = useRef(false);

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      tags: '',
      isPublic: false,
    },
  });

  // Populate form when resource loads
  useEffect(() => {
    if (resource) {
      isResettingRef.current = true;
      form.reset({
        name: resource.name,
        description: resource.description || '',
        tags: resource.tags.join(', '),
        isPublic: resource.isPublic,
      });
      // Use setTimeout to ensure the watch callback has fired before we clear the flag
      setTimeout(() => {
        isResettingRef.current = false;
      }, 0);
    }
  }, [resource, form]);

  // Populate content when it loads
  useEffect(() => {
    if (originalContent !== undefined) {
      setContent(originalContent);
    }
  }, [originalContent]);

  // Track changes (skip programmatic resets)
  useEffect(() => {
    const subscription = form.watch(() => {
      if (!isResettingRef.current) {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Track content changes
  const handleContentChange = (value: string) => {
    setContent(value);
    setHasUnsavedChanges(true);
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle keyboard save shortcut
  useEffect(() => {
    const handleSave = (_e: CustomEvent<string>) => {
      handleSubmit(form.getValues());
    };

    window.addEventListener('editor-save', handleSave as any);
    return () => window.removeEventListener('editor-save', handleSave as any);
  }, [form, content]);

  const handleNavigate = (path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setDiscardDialogOpen(true);
    } else {
      navigate(path);
    }
  };

  const handleDiscardConfirm = () => {
    setHasUnsavedChanges(false);
    setDiscardDialogOpen(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  const handleSubmit = async (data: FormData) => {
    if (!resource) return;

    try {
      // Update metadata
      await updateResource.mutateAsync({
        id: resource.id,
        data: {
          name: data.name,
          description: data.description || undefined,
          tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          isPublic: data.isPublic,
        },
      });

      // Update content if text-based
      if (isTextBased && content !== originalContent) {
        await updateContent.mutateAsync({ id: resource.id, content });
      }

      setHasUnsavedChanges(false);
      toast.success('Resource saved');
    } catch {
      // Error handling is done in the mutation hooks
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-destructive">Resource not found or failed to load.</p>
        <Button variant="link" onClick={() => navigate('/resources')}>
          Back to Resources
        </Button>
      </div>
    );
  }

  const isSaving = updateResource.isPending || updateContent.isPending;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate(`/resources/${id}`)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <PageHeader title={`Edit: ${resource.name}`} />
        </div>

        <Button
          type="button"
          onClick={form.handleSubmit(handleSubmit)}
          disabled={!hasUnsavedChanges || isSaving}
        >
          <Save className="size-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Content Editor for text-based resources */}
          {isTextBased && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content</CardTitle>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <Skeleton className="h-96" />
                ) : (
                  <ContentEditor
                    value={content}
                    onChange={handleContentChange}
                    resourceType={resource.type}
                    height="400px"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: 'Name is required',
                  minLength: { value: 3, message: 'Min 3 characters' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="tag1, tag2, tag3" />
                    </FormControl>
                    <FormDescription>Comma-separated list</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Public</FormLabel>
                      <FormDescription>
                        Visible to all users in your organization
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Discard Changes Confirmation */}
      <ConfirmDialog
        open={discardDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDiscardDialogOpen(false);
            setPendingNavigation(null);
          }
        }}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to leave without saving?"
        confirmLabel="Discard"
        isDestructive
        onConfirm={handleDiscardConfirm}
        onCancel={() => {
          setDiscardDialogOpen(false);
          setPendingNavigation(null);
        }}
      />
    </div>
  );
}
