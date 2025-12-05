/**
 * Resource Download Utility
 *
 * Shared utility for downloading resources with proper error handling.
 *
 * @module lib/resourceDownload
 */

import { toast } from 'sonner';
import { downloadResource } from '@/services/api/resources.api';

/**
 * Download a resource file with error handling
 *
 * @param resourceId - The ID of the resource to download
 * @param filename - The filename to save as
 * @returns Promise<boolean> - true if download succeeded, false otherwise
 */
export async function downloadResourceFile(
  resourceId: string,
  filename: string
): Promise<boolean> {
  try {
    const blob = await downloadResource(resourceId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    toast.error('Download failed', {
      description: 'The resource could not be downloaded. Please try again.',
    });
    return false;
  }
}
