/**
 * ResourceCreatePage - Create new resource
 *
 * Upload a file or create text-based content directly.
 *
 * @module pages/resources/ResourceCreatePage
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResourceUploader } from '@/components/resources/ResourceUploader';
import { ContentEditor } from '@/components/resources/ContentEditor';
import { useCreateResource } from '@/hooks/api/useResources';
import type { ResourceType, CreateResourcePayload } from '@/types/resource.types';

const DRAFT_KEY = 'resource-draft';

interface FormData {
  name: string;
  description: string;
  type: ResourceType;
  tags: string;
  isPublic: boolean;
  content: string;
}

export default function ResourceCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateResource();

  const [tab, setTab] = useState<'upload' | 'create'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      type: 'document',
      tags: '',
      isPublic: false,
      content: '',
    },
  });

  const { watch, setValue } = form;
  const content = watch('content');
  const resourceType = watch('type');

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (window.confirm('Restore unsaved draft?')) {
          Object.entries(parsed).forEach(([key, value]) => {
            setValue(key as keyof FormData, value as any);
          });
          setTab('create');
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // Ignore invalid draft
      }
    }
  }, [setValue]);

  // Auto-save draft
  useEffect(() => {
    if (tab === 'create' && content) {
      const timeout = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form.getValues()));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [content, tab, form]);

  const handleFileSelect = (file: File, detectedType: ResourceType) => {
    setSelectedFile(file);
    setValue('type', detectedType);
    setValue('name', file.name.replace(/\.[^/.]+$/, '')); // Remove extension
  };

  const handleSubmit = async (data: FormData) => {
    const payload: CreateResourcePayload = {
      name: data.name,
      type: data.type,
      description: data.description || undefined,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      isPublic: data.isPublic,
    };

    if (tab === 'upload' && selectedFile) {
      payload.file = selectedFile;
    } else if (tab === 'create') {
      payload.content = data.content;
    }

    const resource = await createMutation.mutateAsync(payload);
    localStorage.removeItem(DRAFT_KEY);
    navigate(`/resources/${resource.id}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/resources')}>
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader title="Create Resource" description="Upload a file or create content directly" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'upload' | 'create')}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1">
            Upload File
          </TabsTrigger>
          <TabsTrigger value="create" className="flex-1">
            Create Content
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
            <TabsContent value="upload" className="mt-0">
              <ResourceUploader
                onFileSelect={handleFileSelect}
                disabled={createMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="create" className="mt-0 space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="prompt">Prompt (Markdown)</SelectItem>
                        <SelectItem value="data">Data (JSON/CSV)</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                      </SelectContent>
                    </Select>
                    {resourceType === 'prompt' && (
                      <FormDescription>
                        Use {'{{$.path}}'} syntax for template interpolation
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <ContentEditor
                        value={field.value}
                        onChange={field.onChange}
                        resourceType={resourceType}
                        height="400px"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Common fields */}
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
                    <Input {...field} placeholder="My Resource" />
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
                    <Textarea {...field} placeholder="Optional description..." />
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
                  <FormDescription>Comma-separated list of tags</FormDescription>
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
                      Make this resource visible to all users in your organization
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/resources')}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || (tab === 'upload' && !selectedFile)}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Resource'}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}
